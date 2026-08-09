'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await apiClient.forgotPassword(email);
      setMessage(response.message);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
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
              <h2 className="text-3xl font-bold text-primary">Forgot Password</h2>
              <p className="mt-2 text-sm text-secondary">
                Enter your email to receive a password reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-primary">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full bg-card-secondary border border-card text-primary placeholder-muted focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-3 radius-md transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 radius-md">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 radius-md whitespace-pre-line">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium text-white bg-primary-cta radius-lg bg-primary-cta-hover shadow-card hover:shadow-soft transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
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
