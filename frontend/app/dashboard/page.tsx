'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';
import AppLayout from '@/components/AppLayout';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [userData, docsResponse] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.searchDocuments({ limit: 10 })
      ]);
      setUser(userData);
      setDocuments(docsResponse.results || []);
    } catch (err) {
      console.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    { label: 'Total Documents', value: documents.length.toString(), change: '', color: 'blue' },
    { label: 'Pending Review', value: documents.filter(d => d.status === 'pending').length.toString(), change: '', color: 'yellow' },
    { label: 'Processed', value: documents.filter(d => d.status === 'processed').length.toString(), change: '', color: 'green' },
    { label: 'In Review', value: documents.filter(d => d.status === 'review').length.toString(), change: '', color: 'blue' },
  ];

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.first_name || 'User'}!</h2>
          <p className="mt-2 text-gray-600">Here's what's happening with your documents.</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className={`text-sm font-medium text-${stat.color}-600`}>
                      {stat.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Documents */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
                <Link href="/documents" className="text-sm text-blue-600 hover:text-blue-700">
                  View all
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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

            {/* Quick Actions */}
            <div className="mt-8 bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href="/upload"
                  className="flex items-center justify-center px-4 py-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <span className="text-2xl mr-2">📤</span>
                  Upload Document
                </Link>
                <Link
                  href="/review"
                  className="flex items-center justify-center px-4 py-6 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <span className="text-2xl mr-2">✅</span>
                  Review Queue
                </Link>
                <Link
                  href="/search"
                  className="flex items-center justify-center px-4 py-6 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <span className="text-2xl mr-2">🔍</span>
                  Search Documents
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
