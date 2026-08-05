'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  const sidebarItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Upload', href: '/upload', icon: '📤' },
    { name: 'Documents', href: '/documents', icon: '📁' },
    { name: 'Review Queue', href: '/review', icon: '✅' },
    { name: 'Processing', href: '/processing', icon: '⚙️' },
    { name: 'Search', href: '/search', icon: '🔍' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
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
      if (pathname !== '/') {
        window.location.href = '/';
      }
    }
  }

  async function handleLogout() {
    await apiClient.logout();
    window.location.href = '/';
  }

  // Don't show sidebar on login page
  if (pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-main flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-card border-r border-card transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0`}>
        {sidebarOpen && (
          <div className="flex flex-col h-full w-64">
            <div className="flex items-center justify-between h-16 border-b border-card px-4">
              <span className="text-primary text-xl font-bold">
                FormBridge
              </span>
            </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium radius-lg transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-accent-blue text-white'
                    : 'text-secondary hover:bg-card-secondary hover:text-primary'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="border-t border-card p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-accent-blue flex items-center justify-center text-white font-medium">
                {user ? `${user.first_name[0]}${user.last_name[0]}` : 'JD'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">
                  {user ? `${user.first_name} ${user.last_name}` : 'John Doe'}
                </p>
                <p className="text-xs text-muted">
                  {user ? user.email : 'john@example.com'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-card text-sm font-medium text-secondary hover:border-accent-blue hover:text-primary transition-all duration-200 radius-lg"
            >
              Logout
            </button>
          </div>
        </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-8 bg-card border-b border-card">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-secondary hover:text-primary transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-primary text-2xl font-bold">
              {sidebarItems.find(item => item.href === pathname)?.name || 'FormBridge'}
            </h1>
          </div>
          <div className="h-8 w-8 rounded-full bg-accent-blue flex items-center justify-center text-white font-medium text-sm">
            {user ? `${user.first_name[0]}${user.last_name[0]}` : 'JD'}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
