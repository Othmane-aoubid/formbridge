'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, ReviewQueueItem } from '../../lib/api';
import AppLayout from '@/components/AppLayout';

export default function ReviewQueuePage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
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
      const response = await apiClient.getReviewQueue(params);
      setQueue(response.queue);
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
      setQueue(queue.filter(item => item.documentId !== documentId));
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">

            <div className="mb-6 flex space-x-4">
              <div>
                <label htmlFor="docType" className="block text-sm font-medium text-gray-700">
                  Document Type
                </label>
                <select
                  id="docType"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                >
                  <option value="">All Types</option>
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                >
                  <option value="">All Statuses</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label htmlFor="createdDate" className="block text-sm font-medium text-gray-700">
                  Created Date
                </label>
                <input
                  id="createdDate"
                  type="date"
                  value={createdDate}
                  onChange={(e) => setCreatedDate(e.target.value)}
                  className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No documents pending review
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Filename
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {queue.map((item) => (
                      <tr key={item.documentId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.filename}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.documentType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.status}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <Link
                            href={`/review/${item.documentId}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Review
                          </Link>
                          <button
                            onClick={() => handleDelete(item.documentId)}
                            className="text-red-600 hover:text-red-900"
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
