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
      ingested: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
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
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
              <button
                onClick={() => setError('')}
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
              >
                <span className="text-red-500">&times;</span>
              </button>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{success}</span>
              <button
                onClick={() => setSuccess('')}
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
              >
                <span className="text-green-500">&times;</span>
              </button>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Document Processing</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Processing</p>
                  <p className="text-2xl font-bold text-yellow-600">{processingDocs.length}</p>
                </div>
                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">⚙️</span>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{completedDocs.length}</p>
                </div>
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{failedDocs.length}</p>
                </div>
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">❌</span>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ingested</p>
                  <p className="text-2xl font-bold text-blue-600">{ingestedDocs.length}</p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">📥</span>
                </div>
              </div>
            </div>
          </div>

          {/* Currently Processing */}
          {processingDocs.length > 0 && (
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Currently Processing</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {processingDocs.map((doc) => (
                  <div key={doc.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                      <p className="text-xs text-gray-500">Processing...</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleStopProcessing(doc.id)}
                        className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 border border-red-600 rounded"
                      >
                        Stop
                      </button>
                      <Link
                        href={`/processing/${doc.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm"
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
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Failed Documents</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {failedDocs.map((doc) => (
                  <div key={doc.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                      </div>
                      <button
                        onClick={() => handleReprocess(doc.id)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-600 rounded"
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
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Documents</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{doc.filename}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {doc.documentType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {doc.status === 'completed' || doc.status === 'needs_review' ? (
                          <>
                            <Link href={`/review/${doc.id}`} className="text-blue-600 hover:text-blue-900">
                              Review
                            </Link>
                            <button
                              onClick={() => handleReprocess(doc.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Reprocess
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id, doc.filename)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </>
                        ) : doc.status === 'failed' ? (
                          <>
                            <button
                              onClick={() => handleReprocess(doc.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Reprocess
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id, doc.filename)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDelete(doc.id, doc.filename)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
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
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="bg-red-50 px-6 py-4 rounded-t-lg border-b border-red-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Delete Document</h3>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold text-gray-900">"{deleteModal.filename}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-3 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
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
