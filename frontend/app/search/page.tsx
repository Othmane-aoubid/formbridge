'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const sidebarItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊', current: false },
    { name: 'Upload', href: '/upload', icon: '📤', current: false },
    { name: 'Documents', href: '/documents', icon: '📁', current: false },
    { name: 'Review Queue', href: '/review', icon: '✅', current: false },
    { name: 'Search', href: '/search', icon: '🔍', current: true },
    { name: 'Settings', href: '/settings', icon: '⚙️', current: false },
  ];

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Failed to load user');
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await apiClient.searchDocuments({ query, limit: 20 });
      setResults(response.results || []);
    } catch (err) {
      console.error('Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await apiClient.logout();
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
            <span className="text-2xl font-bold text-blue-600">
              FormBridge
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-700 hover:text-blue-600"
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  )}
                </svg>
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-700 hover:text-blue-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  item.current
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                {user ? `${user.first_name[0]}${user.last_name[0]}` : 'JD'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {user ? `${user.first_name} ${user.last_name}` : 'John Doe'}
                </p>
                <p className="text-xs text-gray-500">
                  {user ? user.email : 'john@example.com'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-700 hover:text-blue-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="text-xl font-bold text-blue-600">
            FormBridge
          </Link>
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
            {user ? `${user.first_name[0]}${user.last_name[0]}` : 'JD'}
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between h-16 px-8 bg-white border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Search Documents</h1>
        </div>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <form onSubmit={handleSearch} className="flex gap-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {results.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Results ({results.length})</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {results.map((doc: any) => (
                    <div key={doc.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                        <p className="text-xs text-gray-500">{doc.documentType} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Link href={`/review/${doc.id}`} className="text-blue-600 hover:text-blue-900 text-sm">
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {query && results.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">No documents found matching "{query}"</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
