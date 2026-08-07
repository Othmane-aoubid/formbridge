class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private isConnecting: boolean = false;
  private isConnected: boolean = false;
  private connectionCount: number = 0;

  connect() {
    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      console.log('WebSocket already connecting, skipping duplicate request');
      return;
    }
    
    // If already connected, don't reconnect
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected, skipping duplicate request');
      return;
    }
    
    this.isConnecting = true;
    this.connectionCount++;
    console.log(`WebSocket connection attempt #${this.connectionCount}`);
    
    // Use the same protocol as the current page (ws for http, wss for https)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NEXT_PUBLIC_API_PORT || '8000';
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${host}:${port}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.isConnected = true;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.isConnected = false;
        // Only attempt reconnect if it wasn't intentionally disconnected
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.isConnected = false;
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.isConnected = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }
    this.isConnecting = false;
    this.isConnected = false;
  }
}

// Singleton instance
let wsClientInstance: WebSocketClient | null = null;

export const wsClient = () => {
  if (!wsClientInstance) {
    wsClientInstance = new WebSocketClient();
  }
  return wsClientInstance;
};
