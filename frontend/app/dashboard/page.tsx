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
      <div className="px-6 md:px-16 lg:px-24 py-8">
        <div className="mb-8">
          <h2 className="text-primary text-2xl md:text-3xl font-bold">Welcome back, {user?.first_name || 'User'}!</h2>
          <p className="mt-2 text-secondary">Here's what's happening with your documents.</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
            <p className="mt-4 text-secondary">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-card radius-card border border-card p-6 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted text-sm font-medium">{stat.label}</p>
                      <p className="text-primary text-2xl font-bold mt-2">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Documents */}
            <div className="bg-card radius-card border border-card shadow-card">
              <div className="px-6 py-4 border-b border-card flex items-center justify-between">
                <h2 className="text-primary text-lg font-semibold">Recent Documents</h2>
                <Link href="/documents" className="text-sm text-secondary hover:text-primary transition-colors">
                  View all
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-card">
                  <thead className="bg-card-secondary">
                    <tr>
                      <th className="px-6 py-3 text-left text-muted text-xs font-medium uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-muted text-xs font-medium uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-muted text-xs font-medium uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-muted text-xs font-medium uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-muted text-xs font-medium uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-card">
                    {documents.map((doc: any) => (
                      <tr key={doc.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-primary text-sm font-medium">{doc.filename}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold bg-accent-blue/20 text-blue-400 radius-md">
                            {doc.documentType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold radius-md ${
                            doc.status === 'processed' ? 'bg-green-500/20 text-green-400' :
                            doc.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-secondary text-sm">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link href={`/review/${doc.id}`} className="text-accent-blue hover:text-blue-400 transition-colors">
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {documents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-secondary">
                          No documents yet. Upload your first document to get started!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-card radius-card border border-card shadow-card">
              <div className="px-6 py-4 border-b border-card">
                <h2 className="text-primary text-lg font-semibold">Quick Actions</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href="/upload"
                  className="flex items-center justify-center px-4 py-6 border border-card text-sm font-medium bg-primary-cta text-white radius-lg bg-primary-cta-hover transition-all duration-200 hover:shadow-card"
                >
                  <span className="text-2xl mr-2">📤</span>
                  Upload Document
                </Link>
                <Link
                  href="/review"
                  className="flex items-center justify-center px-4 py-6 border border-card text-sm font-medium text-secondary hover:border-accent-blue hover:text-primary radius-lg transition-all duration-200 hover:shadow-card"
                >
                  <span className="text-2xl mr-2">✅</span>
                  Review Queue
                </Link>
                <Link
                  href="/search"
                  className="flex items-center justify-center px-4 py-6 border border-card text-sm font-medium text-secondary hover:border-accent-blue hover:text-primary radius-lg transition-all duration-200 hover:shadow-card"
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
