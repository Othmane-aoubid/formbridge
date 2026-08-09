'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../../lib/api';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.resetPassword(token, newPassword);
      setMessage(response.message);
      
      // Redirect to sign in after successful reset
      setTimeout(() => {
        window.location.href = '/signin';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-main flex flex-col">
      <header className="bg-card border-b border-card">
        <div className="max-w-[1280px] mx-auto px-6 md:px-16 lg:px-24 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-primary">
              FormBridge
            </Link>
            <Link
              href="/signin"
              className="text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <div className="bg-card radius-card border border-card shadow-soft p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-primary">Reset Password</h2>
              <p className="mt-2 text-sm text-secondary">
                Enter your new password
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-primary">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full bg-card-secondary border border-card text-primary placeholder-muted focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-3 radius-md transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full bg-card-secondary border border-card text-primary placeholder-muted focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-3 radius-md transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 radius-md">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 radius-md">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium text-white bg-primary-cta radius-lg bg-primary-cta-hover shadow-card hover:shadow-soft transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="bg-card border-t border-card py-6">
        <div className="max-w-[1280px] mx-auto px-6 md:px-16 lg:px-24 text-center">
          <p className="text-sm text-muted">
            © 2024 FormBridge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
