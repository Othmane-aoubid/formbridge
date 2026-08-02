'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';
import AppLayout from '@/components/AppLayout';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDocuments();
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
      window.location.href = `/review/${documentId}`;
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

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
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
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading documents...</p>
          </div>
        ) : (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc: any) => (
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          doc.status === 'processed' ? 'bg-green-100 text-green-800' :
                          doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleReprocess(doc.id)}
                          disabled={doc.status === 'processing'}
                          className={doc.status === 'processing' ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-900'}
                        >
                          Reprocess
                        </button>
                        <button
                          onClick={() => handleStopProcessing(doc.id)}
                          disabled={doc.status !== 'processing'}
                          className={doc.status !== 'processing' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}
                        >
                          Stop
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={doc.status === 'processing'}
                          className={doc.status === 'processing' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}
                        >
                          Delete
                        </button>
                        <Link href={`/review/${doc.id}`} className="text-blue-600 hover:text-blue-900">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No documents yet. Upload your first document to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
