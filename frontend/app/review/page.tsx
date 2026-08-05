'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, ReviewQueueItem } from '../../lib/api';
import AppLayout from '@/components/AppLayout';

export default function ReviewQueuePage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentType, setDocumentType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [createdDate, setCreatedDate] = useState<string>('');

  useEffect(() => {
    loadQueue();
  }, [documentType, status]);

  async function loadQueue() {
    setLoading(true);
    try {
      const params: any = {};
      if (documentType) params.documentType = documentType;
      if (status) params.status = status;
      
      // If no filters applied, show all documents
      if (!documentType && !status) {
        const docsResponse = await apiClient.searchDocuments({ limit: 50 });
        setQueue(docsResponse.results.map((doc: any) => ({
          documentId: doc.id,
          filename: doc.filename,
          documentType: doc.documentType,
          status: doc.status,
          confidenceScore: 0,
          createdAt: doc.createdAt
        })));
      } else {
        const response = await apiClient.getReviewQueue(params);
        setQueue(response.queue);
      }
    } catch (error) {
      console.error('Failed to load review queue:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(documentId: string) {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await apiClient.deleteDocument(documentId);
      setSuccess('Document deleted successfully');
      setQueue(queue.filter(item => item.documentId !== documentId));
    } catch (error) {
      console.error('Failed to delete document:', error);
      setError('Failed to delete document');
    }
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="bg-card radius-card border border-card shadow-card">
          <div className="px-4 py-5 sm:p-6">

            <div className="mb-6 flex space-x-4">
              <div>
                <label htmlFor="docType" className="block text-sm font-medium text-primary">
                  Document Type
                </label>
                <select
                  id="docType"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="mt-1 block bg-card-secondary border border-card text-primary focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-2 radius-md transition-colors"
                >
                  <option value="">All Types</option>
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-primary">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 block bg-card-secondary border border-card text-primary focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-2 radius-md transition-colors"
                >
                  <option value="">All Statuses</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label htmlFor="createdDate" className="block text-sm font-medium text-primary">
                  Created Date
                </label>
                <input
                  id="createdDate"
                  type="date"
                  value={createdDate}
                  onChange={(e) => setCreatedDate(e.target.value)}
                  className="mt-1 block bg-card-secondary border border-card text-primary focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-2 radius-md transition-colors"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-12 text-secondary">
                No documents pending review
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-card">
                  <thead className="bg-card-secondary">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Filename
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-card">
                    {queue.map((item) => (
                      <tr key={item.documentId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                          {item.filename}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {item.documentType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {item.status}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <Link
                            href={`/review/${item.documentId}`}
                            className="text-accent-blue hover:text-blue-400 transition-colors"
                          >
                            Review
                          </Link>
                          <button
                            onClick={() => handleDelete(item.documentId)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
