'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { wsClient } from '@/lib/websocket';
import AppLayout from '@/components/AppLayout';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw, 
  Square, 
  Eye, 
  Trash2,
  LayoutGrid,
  Table,
  Search,
  Filter,
  Upload,
  Download
} from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [processingProgress, setProcessingProgress] = useState<Record<string, { progress: number; step: string }>>({});

  useEffect(() => {
    loadDocuments();
    
    // Connect to WebSocket for real-time updates
    const client = wsClient();
    client.connect();
    
    client.onMessage('document_update', (message: any) => {
      console.log('Document update received:', message);
      // Update the specific document in the list
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === message.document_id 
            ? { ...doc, status: message.status, processingProgress: message.progress }
            : doc
        )
      );
      // Update processing progress state
      setProcessingProgress(prev => ({
        ...prev,
        [message.document_id]: {
          progress: message.progress || 0,
          step: message.step || 'Processing'
        }
      }));
    });
    
    return () => {
      client.disconnect();
    };
  }, []);

  async function loadDocuments() {
    try {
      const docsResponse = await apiClient.searchDocuments({ limit: 50 });
      setDocuments(docsResponse.results || []);
      setError('');
    } catch (err) {
      console.error('Failed to load documents');
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleReprocess(documentId: string) {
    try {
      await apiClient.reprocessDocument(documentId);
      setSuccess('Document reprocessing started');
      loadDocuments(); // Refresh to show updated status
    } catch (error) {
      console.error('Failed to reprocess document:', error);
      setError('Failed to reprocess document');
    }
  }

  async function handleStopProcessing(documentId: string) {
    try {
      await apiClient.stopProcessing(documentId);
      setSuccess('Processing stopped successfully');
      loadDocuments();
    } catch (error) {
      console.error('Failed to stop processing:', error);
      setError('Failed to stop processing');
    }
  }

  async function handleDelete(documentId: string) {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }
    try {
      await apiClient.deleteDocument(documentId);
      setSuccess('Document deleted successfully');
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Failed to delete document:', error);
      setError('Failed to delete document');
    }
  }

  async function handleExportDocument(documentId: string, format: string) {
    try {
      setSuccess(`Exporting document as ${format.toUpperCase()}...`);
      const blob = await apiClient.exportDocument(documentId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document_${documentId}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess(`Document exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to export document:', error);
      setError('Failed to export document');
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.documentType && doc.documentType.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: documents.length,
    completed: documents.filter(d => d.status === 'completed' || d.status === 'processed').length,
    processing: documents.filter(d => d.status === 'processing' || d.status === 'ingested').length,
    needs_review: documents.filter(d => d.status === 'needs_review' || d.status === 'pending').length,
    failed: documents.filter(d => d.status === 'failed').length,
  };

  function getStatusBadge(status: string) {
    const statusStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle size={14} /> },
      processed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle size={14} /> },
      processing: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <RefreshCw size={14} /> },
      ingested: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <Clock size={14} /> },
      needs_review: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Clock size={14} /> },
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Clock size={14} /> },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle size={14} /> },
    };
    return statusStyles[status] || { bg: 'bg-card-secondary', text: 'text-muted', icon: <FileText size={14} /> };
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-primary mb-2">Documents</h2>
          <p className="text-secondary">Manage and track all your uploaded documents</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'All', count: statusCounts.all, color: 'blue', icon: <FileText size={24} /> },
            { label: 'Completed', count: statusCounts.completed, color: 'green', icon: <CheckCircle size={24} /> },
            { label: 'Processing', count: statusCounts.processing, color: 'blue', icon: <RefreshCw size={24} /> },
            { label: 'Needs Review', count: statusCounts.needs_review, color: 'yellow', icon: <Clock size={24} /> },
            { label: 'Failed', count: statusCounts.failed, color: 'red', icon: <XCircle size={24} /> },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setStatusFilter(stat.label.toLowerCase().replace(' ', '_'))}
              className={`p-4 radius-card border shadow-card transition-all duration-200 hover:-translate-y-1 ${
                statusFilter === stat.label.toLowerCase().replace(' ', '_')
                  ? 'bg-accent-blue/20 border-accent-blue'
                  : 'bg-card border-card hover:border-accent-blue/50'
              }`}
            >
              <div className="mb-2 text-accent-blue">{stat.icon}</div>
              <div className="text-2xl font-bold text-primary">{stat.count}</div>
              <div className="text-xs text-secondary mt-1">{stat.label}</div>
            </button>
          ))}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-card radius-card border border-card shadow-card mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search documents by name or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card-secondary border border-card text-primary px-4 py-2 radius-md focus:border-accent-blue focus:ring-accent-blue transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 border radius-md transition-colors flex items-center gap-2 ${
                  viewMode === 'table'
                    ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                    : 'bg-card-secondary border-card text-secondary hover:border-accent-blue hover:text-primary'
                }`}
              >
                <Table size={16} />
                Table
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 border radius-md transition-colors flex items-center gap-2 ${
                  viewMode === 'grid'
                    ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                    : 'bg-card-secondary border-card text-secondary hover:border-accent-blue hover:text-primary'
                }`}
              >
                <LayoutGrid size={16} />
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 radius-md relative">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError('')}
              className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-400 hover:text-red-300 transition-colors"
            >
              <span>&times;</span>
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 radius-md relative">
            <span className="block sm:inline">{success}</span>
            <button
              onClick={() => setSuccess('')}
              className="absolute top-0 bottom-0 right-0 px-4 py-3 text-green-400 hover:text-green-300 transition-colors"
            >
              <span>&times;</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
            <p className="mt-4 text-secondary">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-card radius-card border border-card shadow-card p-12 text-center">
            <span className="text-6xl mb-4">📄</span>
            <h3 className="text-xl font-semibold text-primary mb-2">No documents found</h3>
            <p className="text-secondary mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Upload your first document to get started!'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link
                href="/upload"
                className="inline-flex items-center px-6 py-3 bg-primary-cta text-white radius-lg bg-primary-cta-hover transition-colors"
              >
                <span className="text-xl mr-2">📤</span>
                Upload Document
              </Link>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-card radius-card border border-card shadow-card">
            <div className="px-6 py-4 border-b border-card flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Document List</h3>
              <span className="text-sm text-secondary">{filteredDocuments.length} documents</span>
            </div>
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="min-w-full divide-y divide-card">
                <thead className="bg-card-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-card">
                  {filteredDocuments.map((doc: any) => {
                    const statusStyle = getStatusBadge(doc.status);
                    return (
                      <tr key={doc.id} className="hover:bg-card-secondary transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded bg-accent-blue/20 flex items-center justify-center mr-3">
                              <FileText size={16} className="text-blue-400" />
                            </div>
                            <div className="text-sm font-medium text-primary">{doc.filename}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold radius-md bg-accent-blue/20 text-blue-400">
                            {doc.documentType || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold radius-md ${statusStyle.bg} ${statusStyle.text} mb-2`}>
                              <span className="mr-1">{statusStyle.icon}</span>
                              {doc.status}
                            </span>
                            {(doc.status === 'processing' || doc.status === 'ingested') && (
                              <div className="w-full">
                                <div className="flex items-center justify-between text-xs text-secondary mb-1">
                                  <span>{processingProgress[doc.id]?.step || doc.processingStep || 'Processing...'}</span>
                                  <span className="font-mono">{processingProgress[doc.id]?.progress || doc.processingProgress || 0}%</span>
                                </div>
                                <div className="w-full bg-card-secondary rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500 ease-out" 
                                    style={{ width: `${processingProgress[doc.id]?.progress || doc.processingProgress || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {doc.confidenceScores && Object.keys(doc.confidenceScores).length > 0 ? (
                            (() => {
                              const scores = Object.values(doc.confidenceScores) as number[];
                              const avgConfidence = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
                              const confidencePercent = Math.round(avgConfidence * 100);
                              const confidenceColor = confidencePercent >= 80 ? 'text-green-400' : confidencePercent >= 50 ? 'text-yellow-400' : 'text-red-400';
                              const confidenceBg = confidencePercent >= 80 ? 'bg-green-500/20' : confidencePercent >= 50 ? 'bg-yellow-500/20' : 'bg-red-500/20';
                              return (
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold radius-md ${confidenceBg} ${confidenceColor}`}>
                                  {confidencePercent}%
                                </span>
                              );
                            })()
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold radius-md bg-card-secondary text-muted">
                              N/A
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/review/${doc.id}`}
                              className="px-2 py-1 text-accent-blue hover:text-blue-400 transition-colors"
                              title="Review"
                            >
                              <Eye size={16} />
                            </Link>
                            <button
                              onClick={() => handleReprocess(doc.id)}
                              disabled={doc.status === 'processing'}
                              className={`px-2 py-1 transition-colors ${
                                doc.status === 'processing' ? 'text-muted cursor-not-allowed' : 'text-accent-blue hover:text-blue-400'
                              }`}
                              title="Reprocess"
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button
                              onClick={() => handleStopProcessing(doc.id)}
                              disabled={doc.status !== 'processing'}
                              className={`px-2 py-1 transition-colors ${
                                doc.status !== 'processing' ? 'text-muted cursor-not-allowed' : 'text-red-400 hover:text-red-300'
                              }`}
                              title="Stop"
                            >
                              <Square size={16} />
                            </button>
                            <div className="relative group">
                              <button
                                className="px-2 py-1 text-accent-blue hover:text-blue-400 transition-colors"
                                title="Export"
                              >
                                <Download size={16} />
                              </button>
                              <div className="absolute right-0 mt-2 w-32 bg-card border border-card shadow-card radius-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                <button
                                  onClick={() => handleExportDocument(doc.id, 'csv')}
                                  className="block w-full text-left px-4 py-2 text-sm text-secondary hover:bg-card-secondary hover:text-primary transition-colors"
                                >
                                  CSV
                                </button>
                                <button
                                  onClick={() => handleExportDocument(doc.id, 'excel')}
                                  className="block w-full text-left px-4 py-2 text-sm text-secondary hover:bg-card-secondary hover:text-primary transition-colors"
                                >
                                  Excel
                                </button>
                                <button
                                  onClick={() => handleExportDocument(doc.id, 'json')}
                                  className="block w-full text-left px-4 py-2 text-sm text-secondary hover:bg-card-secondary hover:text-primary transition-colors"
                                >
                                  JSON
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="px-2 py-1 text-red-400 hover:text-red-300 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc: any) => {
              const statusStyle = getStatusBadge(doc.status);
              return (
                <div key={doc.id} className="bg-card radius-card border border-card shadow-card p-6 hover:shadow-soft transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded bg-accent-blue/20 flex items-center justify-center">
                      <FileText size={24} className="text-blue-400" />
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold radius-md ${statusStyle.bg} ${statusStyle.text}`}>
                      <span className="mr-1">{statusStyle.icon}</span>
                      {doc.status}
                    </span>
                  </div>
                  <h4 className="text-primary font-medium mb-2 truncate">{doc.filename}</h4>
                  <p className="text-secondary text-sm mb-4">{doc.documentType || 'Unknown'}</p>
                  {(doc.status === 'processing' || doc.status === 'ingested') && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-secondary mb-1">
                        <span>{processingProgress[doc.id]?.step || doc.processingStep || 'Processing...'}</span>
                        <span className="font-mono">{processingProgress[doc.id]?.progress || doc.processingProgress || 0}%</span>
                      </div>
                      <div className="w-full bg-card-secondary rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${processingProgress[doc.id]?.progress || doc.processingProgress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-muted mb-4">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-card">
                    <Link
                      href={`/review/${doc.id}`}
                      className="text-sm text-accent-blue hover:text-blue-400 transition-colors"
                    >
                      Review →
                    </Link>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleReprocess(doc.id)}
                        disabled={doc.status === 'processing'}
                        className={`p-2 rounded transition-colors ${
                          doc.status === 'processing' ? 'text-muted cursor-not-allowed' : 'text-accent-blue hover:text-blue-400'
                        }`}
                        title="Reprocess"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <div className="relative group">
                        <button
                          className="p-2 rounded text-accent-blue hover:text-blue-400 transition-colors"
                          title="Export"
                        >
                          <Download size={16} />
                        </button>
                        <div className="absolute right-0 mt-2 w-32 bg-card border border-card shadow-card radius-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <button
                            onClick={() => handleExportDocument(doc.id, 'csv')}
                            className="block w-full text-left px-4 py-2 text-sm text-secondary hover:bg-card-secondary hover:text-primary transition-colors"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => handleExportDocument(doc.id, 'excel')}
                            className="block w-full text-left px-4 py-2 text-sm text-secondary hover:bg-card-secondary hover:text-primary transition-colors"
                          >
                            Excel
                          </button>
                          <button
                            onClick={() => handleExportDocument(doc.id, 'json')}
                            className="block w-full text-left px-4 py-2 text-sm text-secondary hover:bg-card-secondary hover:text-primary transition-colors"
                          >
                            JSON
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 rounded text-red-400 hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
