'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';
import AppLayout from '@/components/AppLayout';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

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

  async function handleLogout() {
    await apiClient.logout();
    window.location.href = '/';
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card radius-card border border-card shadow-card">
            <div className="px-6 py-4 border-b border-card">
              <h2 className="text-lg font-semibold text-primary">Account Settings</h2>
            </div>
            <div className="px-6 py-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-primary">Name</label>
                <p className="mt-1 text-sm text-primary">
                  {user ? `${user.first_name} ${user.last_name}` : 'Loading...'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary">Email</label>
                <p className="mt-1 text-sm text-primary">
                  {user ? user.email : 'Loading...'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary">Member Since</label>
                <p className="mt-1 text-sm text-primary">
                  {user ? new Date(user.created_at).toLocaleDateString() : 'Loading...'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card radius-card border border-card shadow-card mt-6">
            <div className="px-6 py-4 border-b border-card">
              <h2 className="text-lg font-semibold text-primary">Preferences</h2>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Email Notifications</p>
                  <p className="text-xs text-muted">Receive email updates about your documents</p>
                </div>
                <button className="bg-accent-blue text-white px-4 py-2 rounded-md text-sm hover:bg-blue-400 transition-colors">
                  Enabled
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Dark Mode</p>
                  <p className="text-xs text-muted">Switch to dark theme</p>
                </div>
                <button className="bg-card-secondary border border-card text-secondary px-4 py-2 rounded-md text-sm hover:text-primary transition-colors">
                  Disabled
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
