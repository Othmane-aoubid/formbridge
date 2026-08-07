'use client';

import { useState, useEffect } from 'react';
import { apiClient, DocumentResponse } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

export default function ProcessingPage() {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; documentId: string; filename: string }>({ show: false, documentId: '', filename: '' });
  const router = useRouter();

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const docsResponse = await apiClient.searchDocuments({ limit: 50, status: 'processing' });
      setDocuments(docsResponse.results || []);
    } catch (err) {
      console.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleReprocess(documentId: string) {
    try {
      await apiClient.reprocessDocument(documentId);
      setSuccess('Document reprocessing started');
      loadDocuments();
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

  async function handleDelete(documentId: string, filename: string) {
    setDeleteModal({ show: true, documentId, filename });
  }

  async function confirmDelete() {
    try {
      await apiClient.deleteDocument(deleteModal.documentId);
      setDeleteModal({ show: false, documentId: '', filename: '' });
      setSuccess('Document deleted successfully');
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      setError('Failed to delete document');
    }
  }

  function cancelDelete() {
    setDeleteModal({ show: false, documentId: '', filename: '' });
  }

  function getStatusBadge(status: string) {
    const statusStyles: Record<string, string> = {
      ingested: 'bg-blue-500/20 text-blue-400',
      processing: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-green-500/20 text-green-400',
      failed: 'bg-red-500/20 text-red-400',
    };
    return statusStyles[status] || 'bg-card-secondary text-muted';
  }

  const processingDocs = documents.filter(d => d.status === 'processing');
  const completedDocs = documents.filter(d => d.status === 'completed');
  const failedDocs = documents.filter(d => d.status === 'failed');
  const ingestedDocs = documents.filter(d => d.status === 'ingested');

  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
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
          <h1 className="text-2xl font-bold text-primary mb-6">Document Processing</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card radius-card border border-card shadow-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary">Processing</p>
                  <p className="text-2xl font-bold text-yellow-400">{processingDocs.length}</p>
                </div>
                <div className="h-10 w-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">⚙️</span>
                </div>
              </div>
            </div>
            <div className="bg-card radius-card border border-card shadow-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary">Completed</p>
                  <p className="text-2xl font-bold text-green-400">{completedDocs.length}</p>
                </div>
                <div className="h-10 w-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
              </div>
            </div>
            <div className="bg-card radius-card border border-card shadow-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary">Failed</p>
                  <p className="text-2xl font-bold text-red-400">{failedDocs.length}</p>
                </div>
                <div className="h-10 w-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">❌</span>
                </div>
              </div>
            </div>
            <div className="bg-card radius-card border border-card shadow-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary">Ingested</p>
                  <p className="text-2xl font-bold text-blue-400">{ingestedDocs.length}</p>
                </div>
                <div className="h-10 w-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">📥</span>
                </div>
              </div>
            </div>
          </div>

          {/* Currently Processing */}
          {processingDocs.length > 0 && (
            <div className="bg-card radius-card border border-card shadow-card mb-6">
              <div className="px-6 py-4 border-b border-card">
                <h2 className="text-lg font-semibold text-primary">Currently Processing</h2>
              </div>
              <div className="divide-y divide-card">
                {processingDocs.map((doc) => (
                  <div key={doc.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-blue"></div>
                      <div>
                        <p className="text-sm font-medium text-primary">{doc.filename}</p>
                        <p className="text-xs text-secondary">Processing...</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleStopProcessing(doc.id)}
                        className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 border border-red-500/30 rounded transition-colors"
                      >
                        Stop
                      </button>
                      <Link
                        href={`/processing/${doc.id}`}
                        className="text-accent-blue hover:text-blue-400 text-sm transition-colors"
                      >
                        View Status
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Documents */}
          {failedDocs.length > 0 && (
            <div className="bg-card radius-card border border-card shadow-card mb-6">
              <div className="px-6 py-4 border-b border-card">
                <h2 className="text-lg font-semibold text-primary">Failed Documents</h2>
              </div>
              <div className="divide-y divide-card">
                {failedDocs.map((doc) => (
                  <div key={doc.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-primary">{doc.filename}</p>
                      </div>
                      <button
                        onClick={() => handleReprocess(doc.id)}
                        className="px-3 py-1 text-xs font-medium text-accent-blue hover:text-blue-400 border border-accent-blue/30 rounded transition-colors"
                      >
                        Reprocess
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Documents */}
          <div className="bg-card radius-card border border-card shadow-card">
            <div className="px-6 py-4 border-b border-card">
              <h2 className="text-lg font-semibold text-primary">All Documents</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-card">
                <thead className="bg-card-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-card">
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-primary">{doc.filename}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold radius-md bg-accent-blue/20 text-blue-400">
                          {doc.documentType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold radius-md ${getStatusBadge(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {doc.status === 'completed' || doc.status === 'needs_review' ? (
                          <>
                            <Link href={`/review/${doc.id}`} className="text-accent-blue hover:text-blue-400 transition-colors">
                              Review
                            </Link>
                            <button
                              onClick={() => handleReprocess(doc.id)}
                              className="text-accent-blue hover:text-blue-400 transition-colors"
                            >
                              Reprocess
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id, doc.filename)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        ) : doc.status === 'failed' ? (
                          <>
                            <button
                              onClick={() => handleReprocess(doc.id)}
                              className="text-accent-blue hover:text-blue-400 transition-colors"
                            >
                              Reprocess
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id, doc.filename)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDelete(doc.id, doc.filename)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-secondary">
                        No documents yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card radius-card border border-card shadow-soft max-w-md w-full mx-4 transform transition-all">
            <div className="bg-red-500/10 px-6 py-4 rounded-t-lg border-b border-red-500/30">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-primary">Delete Document</h3>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-secondary">
                Are you sure you want to delete <span className="font-semibold text-primary">"{deleteModal.filename}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="bg-card-secondary px-6 py-3 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-card rounded-md text-sm font-medium text-secondary bg-card hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
