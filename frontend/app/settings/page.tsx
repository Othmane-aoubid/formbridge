'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';
import AppLayout from '@/components/AppLayout';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('profile');

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

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ];

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-primary mb-2">Settings</h2>
            <p className="text-secondary">Manage your account settings and preferences</p>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 border-b border-card mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-accent-blue text-accent-blue'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-card radius-card border border-card shadow-card">
                <div className="px-6 py-4 border-b border-card">
                  <h3 className="text-lg font-semibold text-primary">Profile Information</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-start space-x-6">
                    <div className="h-24 w-24 rounded-full bg-accent-blue/20 flex items-center justify-center text-4xl">
                      {user ? `${user.first_name[0]}${user.last_name[0]}` : 'JD'}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Full Name</label>
                        <p className="text-secondary">
                          {user ? `${user.first_name} ${user.last_name}` : 'Loading...'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Email Address</label>
                        <p className="text-secondary">
                          {user ? user.email : 'Loading...'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Member Since</label>
                        <p className="text-secondary">
                          {user ? new Date(user.created_at).toLocaleDateString() : 'Loading...'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card radius-card border border-card shadow-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-secondary">Account Type</p>
                      <p className="text-lg font-bold text-primary mt-1">Standard</p>
                    </div>
                    <span className="text-2xl">👤</span>
                  </div>
                </div>
                <div className="bg-card radius-card border border-card shadow-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-secondary">Status</p>
                      <p className="text-lg font-bold text-green-400 mt-1">Active</p>
                    </div>
                    <span className="text-2xl">✓</span>
                  </div>
                </div>
                <div className="bg-card radius-card border border-card shadow-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-secondary">Storage Used</p>
                      <p className="text-lg font-bold text-primary mt-1">0 MB</p>
                    </div>
                    <span className="text-2xl">💾</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="bg-card radius-card border border-card shadow-card">
                <div className="px-6 py-4 border-b border-card">
                  <h3 className="text-lg font-semibold text-primary">Notifications</h3>
                </div>
                <div className="px-6 py-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-card-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-primary">Email Notifications</p>
                      <p className="text-xs text-muted mt-1">Receive email updates about your documents</p>
                    </div>
                    <button className="bg-accent-blue text-white px-4 py-2 rounded-md text-sm hover:bg-blue-400 transition-colors">
                      Enabled
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-primary">Processing Alerts</p>
                      <p className="text-xs text-muted mt-1">Get notified when document processing completes</p>
                    </div>
                    <button className="bg-accent-blue text-white px-4 py-2 rounded-md text-sm hover:bg-blue-400 transition-colors">
                      Enabled
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-primary">Review Reminders</p>
                      <p className="text-xs text-muted mt-1">Remind me about documents needing review</p>
                    </div>
                    <button className="bg-card-secondary border border-card text-secondary px-4 py-2 rounded-md text-sm hover:text-primary transition-colors">
                      Disabled
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-card radius-card border border-card shadow-card">
                <div className="px-6 py-4 border-b border-card">
                  <h3 className="text-lg font-semibold text-primary">Appearance</h3>
                </div>
                <div className="px-6 py-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-card-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-primary">Dark Mode</p>
                      <p className="text-xs text-muted mt-1">Switch to dark theme</p>
                    </div>
                    <button className="bg-accent-blue text-white px-4 py-2 rounded-md text-sm hover:bg-blue-400 transition-colors">
                      Enabled
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-primary">Compact Mode</p>
                      <p className="text-xs text-muted mt-1">Use more compact layout</p>
                    </div>
                    <button className="bg-card-secondary border border-card text-secondary px-4 py-2 rounded-md text-sm hover:text-primary transition-colors">
                      Disabled
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-card radius-card border border-card shadow-card">
                <div className="px-6 py-4 border-b border-card">
                  <h3 className="text-lg font-semibold text-primary">Password</h3>
                </div>
                <div className="px-6 py-6">
                  <div className="flex items-center justify-between p-4 bg-card-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-primary">Change Password</p>
                      <p className="text-xs text-muted mt-1">Update your password to keep your account secure</p>
                    </div>
                    <button className="bg-accent-blue text-white px-4 py-2 rounded-md text-sm hover:bg-blue-400 transition-colors">
                      Change
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-card radius-card border border-card shadow-card">
                <div className="px-6 py-4 border-b border-card">
                  <h3 className="text-lg font-semibold text-primary">Session</h3>
                </div>
                <div className="px-6 py-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-card-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-primary">Active Sessions</p>
                      <p className="text-xs text-muted mt-1">Manage your active login sessions</p>
                    </div>
                    <span className="text-secondary text-sm">1 active</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-primary">Sign Out All Devices</p>
                      <p className="text-xs text-muted mt-1">Sign out from all devices and browsers</p>
                    </div>
                    <button className="bg-card-secondary border border-card text-secondary px-4 py-2 rounded-md text-sm hover:text-red-400 transition-colors">
                      Sign Out All
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-card radius-card border border-card shadow-card">
                <div className="px-6 py-4 border-b border-card">
                  <h3 className="text-lg font-semibold text-primary">Danger Zone</h3>
                </div>
                <div className="px-6 py-6">
                  <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-red-400">Delete Account</p>
                      <p className="text-xs text-muted mt-1">Permanently delete your account and all data</p>
                    </div>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <div className="mt-8 pt-6 border-t border-card">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 border border-card text-sm font-medium text-secondary bg-card-secondary hover:text-primary hover:border-accent-blue radius-lg transition-all duration-200"
            >
              <span className="text-xl mr-2">🚪</span>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
