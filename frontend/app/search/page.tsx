'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';
import AppLayout from '@/components/AppLayout';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentType, setDocumentType] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    loadDocuments();
  }, [documentType, status]);

  async function loadDocuments() {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (query) params.query = query;
      if (documentType) params.documentType = documentType;
      if (status) params.status = status;

      const response = await apiClient.searchDocuments(params);
      setResults(response.results || []);
    } catch (err) {
      console.error('Failed to search documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadDocuments();
  }

  async function handleDelete(documentId: string) {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await apiClient.deleteDocument(documentId);
      setSuccess('Document deleted successfully');
      setResults(results.filter(doc => doc.id !== documentId));
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
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Search Documents</h1>
            <p className="text-secondary">Find any document in your workspace with powerful search and filters</p>
          </div>

          <div className="bg-card radius-card border border-card shadow-soft p-6 mb-6">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by filename, content, or metadata..."
                  className="w-full pl-12 pr-4 py-4 bg-card-secondary border border-card text-primary placeholder-muted focus:border-accent-blue focus:ring-accent-blue rounded-xl transition-all duration-200 text-lg"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-accent-blue hover:bg-blue-400 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-primary">Type:</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="text-sm bg-card-secondary border border-card text-primary rounded-lg px-3 py-1.5 focus:border-accent-blue focus:ring-accent-blue transition-colors"
                >
                  <option value="">All</option>
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-primary">Status:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="text-sm bg-card-secondary border border-card text-primary rounded-lg px-3 py-1.5 focus:border-accent-blue focus:ring-accent-blue transition-colors"
                >
                  <option value="">All</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {(query || documentType || status) && (
                <button
                  onClick={() => {
                    setQuery('');
                    setDocumentType('');
                    setStatus('');
                    loadDocuments();
                  }}
                  className="text-sm text-accent-blue hover:text-blue-400 font-medium flex items-center space-x-1 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear filters</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 bg-card radius-card border border-card shadow-soft">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-primary mb-2">No documents found</h3>
              <p className="text-secondary">Try adjusting your search terms or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((doc: any) => (
                <div key={doc.id} className="bg-card radius-card border border-card shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-semibold radius-md ${
                            doc.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            doc.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                            doc.status === 'needs_review' ? 'bg-yellow-500/20 text-yellow-400' :
                            doc.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            'bg-card-secondary text-muted'
                          }`}>
                            {doc.status}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium radius-md bg-accent-blue/20 text-blue-400">
                            {doc.documentType}
                          </span>
                        </div>
                        <h3 className="font-semibold text-primary mb-1 line-clamp-2">{doc.filename}</h3>
                        <p className="text-sm text-secondary">{new Date(doc.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-card">
                      <Link
                        href={`/review/${doc.id}`}
                        className="flex items-center space-x-1 text-accent-blue hover:text-blue-400 font-medium text-sm transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>View</span>
                      </Link>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="mt-6 text-center text-sm text-secondary">
              Found {results.length} document{results.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
