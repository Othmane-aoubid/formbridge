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

  const totalDocs = documents.length;
  const processedDocs = documents.filter(d => d.status === 'completed' || d.status === 'processed').length;
  const pendingReview = documents.filter(d => d.status === 'needs_review' || d.status === 'pending').length;
  const processingDocs = documents.filter(d => d.status === 'processing' || d.status === 'ingested').length;
  const failedDocs = documents.filter(d => d.status === 'failed').length;
  const successRate = totalDocs > 0 ? Math.round((processedDocs / totalDocs) * 100) : 0;

  // Document type breakdown
  const docTypes: Record<string, number> = {};
  documents.forEach(doc => {
    const type = doc.documentType || 'Unknown';
    docTypes[type] = (docTypes[type] || 0) + 1;
  });

  const stats = [
    { label: 'Total Documents', value: totalDocs.toString(), change: 'All time', color: 'blue', icon: '📄' },
    { label: 'Processing Success Rate', value: `${successRate}%`, change: 'Accuracy', color: 'green', icon: '✓' },
    { label: 'Pending Review', value: pendingReview.toString(), change: 'Needs attention', color: 'yellow', icon: '⏳' },
    { label: 'Currently Processing', value: processingDocs.toString(), change: 'In progress', color: 'blue', icon: processingDocs > 0 ? '⚙️' : '✓' },
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
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-full bg-card-secondary flex items-center justify-center text-2xl">
                      {stat.icon}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      stat.color === 'green' ? 'bg-green-500/20 text-green-400' :
                      stat.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                      stat.color === 'red' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {stat.change}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted text-sm font-medium">{stat.label}</p>
                    <p className="text-primary text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Status Distribution */}
              <div className="bg-card radius-card border border-card shadow-card p-6">
                <h3 className="text-primary text-lg font-semibold mb-6">Document Status Distribution</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Completed', count: processedDocs, color: 'bg-green-500', bgLight: 'bg-green-500/20' },
                    { label: 'Needs Review', count: pendingReview, color: 'bg-yellow-500', bgLight: 'bg-yellow-500/20' },
                    { label: 'Processing', count: processingDocs, color: 'bg-blue-500', bgLight: 'bg-blue-500/20' },
                    { label: 'Failed', count: failedDocs, color: 'bg-red-500', bgLight: 'bg-red-500/20' },
                  ].map((item) => {
                    const percentage = totalDocs > 0 ? (item.count / totalDocs) * 100 : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-secondary">{item.label}</span>
                          <span className="text-primary font-medium">{item.count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-card-secondary rounded-full h-3">
                          <div className={`${item.color} h-3 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document Types */}
              <div className="bg-card radius-card border border-card shadow-card p-6">
                <h3 className="text-primary text-lg font-semibold mb-6">Document Types</h3>
                <div className="space-y-4">
                  {Object.entries(docTypes).length > 0 ? (
                    Object.entries(docTypes).map(([type, count]) => {
                      const percentage = totalDocs > 0 ? (count / totalDocs) * 100 : 0;
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-secondary">{type}</span>
                            <span className="text-primary font-medium">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-card-secondary rounded-full h-3">
                            <div className="bg-accent-blue h-3 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-secondary text-sm">No documents yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Documents */}
            <div className="bg-card radius-card border border-card shadow-card">
              <div className="px-6 py-4 border-b border-card flex items-center justify-between">
                <h2 className="text-primary text-lg font-semibold">Recent Documents</h2>
                <Link href="/documents" className="text-sm text-accent-blue hover:text-blue-400 transition-colors">
                  View all →
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
                      <tr key={doc.id} className="hover:bg-card-secondary transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded bg-accent-blue/20 flex items-center justify-center mr-3">
                              <span className="text-blue-400 text-sm">📄</span>
                            </div>
                            <div className="text-primary text-sm font-medium">{doc.filename}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold bg-accent-blue/20 text-blue-400 radius-md">
                            {doc.documentType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold radius-md ${
                            doc.status === 'completed' || doc.status === 'processed' ? 'bg-green-500/20 text-green-400' :
                            doc.status === 'needs_review' || doc.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            doc.status === 'processing' || doc.status === 'ingested' ? 'bg-blue-500/20 text-blue-400' :
                            doc.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            'bg-card-secondary text-muted'
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
                        <td colSpan={5} className="px-6 py-12 text-center text-secondary">
                          <div className="flex flex-col items-center">
                            <span className="text-4xl mb-4">📄</span>
                            <p>No documents yet. Upload your first document to get started!</p>
                          </div>
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
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/upload"
                  className="flex flex-col items-center justify-center px-4 py-6 border border-card text-sm font-medium bg-primary-cta text-white radius-lg bg-primary-cta-hover transition-all duration-200 hover:shadow-card group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📤</span>
                  <span>Upload Document</span>
                </Link>
                <Link
                  href="/review"
                  className="flex flex-col items-center justify-center px-4 py-6 border border-card text-sm font-medium text-secondary hover:border-accent-blue hover:text-primary radius-lg transition-all duration-200 hover:shadow-card group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">✅</span>
                  <span>Review Queue</span>
                </Link>
                <Link
                  href="/search"
                  className="flex flex-col items-center justify-center px-4 py-6 border border-card text-sm font-medium text-secondary hover:border-accent-blue hover:text-primary radius-lg transition-all duration-200 hover:shadow-card group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔍</span>
                  <span>Search Documents</span>
                </Link>
                <Link
                  href="/processing"
                  className="flex flex-col items-center justify-center px-4 py-6 border border-card text-sm font-medium text-secondary hover:border-accent-blue hover:text-primary radius-lg transition-all duration-200 hover:shadow-card group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">⚙️</span>
                  <span>Processing Status</span>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
