const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface UserRegister {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentCreate {
  filename: string;
  contentType?: string;
  documentType?: 'invoice' | 'receipt' | 'contract' | 'other';
  tenantId?: string;
}

export interface UploadSasResponse {
  documentId: string;
  uploadSasUrl: string;
}

export interface DocumentResponse {
  id: string;
  tenantId?: string;
  blobUri: string;
  filename: string;
  contentType: string;
  documentType: string;
  extractedFields: {
    vendorName?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    totalAmount?: number;
    currency?: string;
    lineItems?: Array<{
      description: string;
      qty: number;
      unitPrice: number;
      amount: number;
    }>;
  };
  confidenceScores: {
    vendorName?: number;
    invoiceNumber?: number;
    totalAmount?: number;
  };
  status: string;
  createdBy?: string;
  createdAt: string;
  audit: Array<{
    actor: string;
    action: string;
    timestamp: string;
  }>;
}

export interface ReviewQueueItem {
  documentId: string;
  filename: string;
  documentType: string;
  status: string;
  confidenceScore: number;
  createdAt: string;
}

export interface ReviewResponse {
  documentId: string;
  filename: string;
  blobUri: string;
  previewUrl: string;
  extractedFields: DocumentResponse['extractedFields'];
  confidenceScores: Record<string, number>;
  status: string;
}

export interface ReviewSubmit {
  correctedFields: DocumentResponse['extractedFields'];
  reviewerId: string;
  comments?: string;
}

class ApiClient {
  private token: string | null = null;
  private baseUrl: string = API_BASE_URL;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || this.token;
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If parsing fails, use the status text
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async register(user: UserRegister): Promise<UserResponse> {
    return this.request<UserResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async login(user: UserLogin): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', user.username);
    formData.append('password', user.password);

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  async getCurrentUser(): Promise<UserResponse> {
    return this.request<UserResponse>('/api/auth/me');
  }

  async logout() {
    this.clearToken();
  }

  async forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
    return this.request<{ message: string; reset_token?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  async createUploadSas(document: DocumentCreate): Promise<UploadSasResponse> {
    return this.request<UploadSasResponse>('/api/documents/upload', {
      method: 'POST',
      body: JSON.stringify(document),
    });
  }

  async uploadDocument(file: File, documentType: string): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);
    formData.append('content_type', file.type);
    formData.append('document_type', documentType);

    const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocument(documentId: string): Promise<DocumentResponse> {
    return this.request<DocumentResponse>(`/api/documents/${documentId}`);
  }

  async getDownloadSas(documentId: string): Promise<{ downloadSasUrl: string }> {
    return this.request<{ downloadSasUrl: string }>(
      `/api/documents/${documentId}/download`
    );
  }

  async searchDocuments(params: {
    query?: string;
    documentType?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ results: DocumentResponse[]; count: number }> {
    const queryString = new URLSearchParams(
      params as Record<string, string>
    ).toString();
    return this.request<{ results: DocumentResponse[]; count: number }>(
      `/api/documents?${queryString}`
    );
  }

  async getReviewQueue(params: {
    confidenceThreshold?: number;
    documentType?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ queue: ReviewQueueItem[]; count: number }> {
    const queryString = new URLSearchParams(
      params as Record<string, string>
    ).toString();
    return this.request<{ queue: ReviewQueueItem[]; count: number }>(
      `/api/review/queue?${queryString}`
    );
  }

  async getReviewDocument(documentId: string): Promise<ReviewResponse> {
    return this.request<ReviewResponse>(`/api/review/${documentId}`);
  }

  async submitReview(
    documentId: string,
    review: ReviewSubmit
  ): Promise<{ message: string; documentId: string; status: string }> {
    return this.request<{ message: string; documentId: string; status: string }>(
      `/api/review/${documentId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify(review),
      }
    );
  }

  async reprocessDocument(documentId: string): Promise<{ message: string; documentId: string }> {
    return this.request<{ message: string; documentId: string }>(
      `/api/documents/${documentId}/reprocess`,
      {
        method: 'POST',
      }
    );
  }

  async deleteDocument(documentId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/api/documents/${documentId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async stopProcessing(documentId: string): Promise<{ message: string; documentId: string }> {
    return this.request<{ message: string; documentId: string }>(
      `/api/documents/${documentId}/stop`,
      {
        method: 'POST',
      }
    );
  }

  async exportDocument(documentId: string, format: string): Promise<Blob> {
    const url = `${this.baseUrl}/api/documents/${documentId}/export?format=${format}`;
    const headers: Record<string, string> = {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  async exportDocumentsBatch(documentIds: string[], format: string): Promise<Blob> {
    const url = `${this.baseUrl}/api/documents/export/batch`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ document_ids: documentIds, format: format }),
    });

    if (!response.ok) {
      throw new Error(`Batch export failed: ${response.statusText}`);
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient();
