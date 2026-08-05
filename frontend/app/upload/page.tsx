'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient, DocumentCreate } from '../../lib/api';
import AppLayout from '@/components/AppLayout';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [documentType, setDocumentType] = useState<'invoice' | 'receipt' | 'contract' | 'other'>('invoice');

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setUploading(true);
    setMessage('Uploading document...');

    try {
      setMessage('Uploading to Azure Storage...');
      const document = await apiClient.uploadDocument(file, documentType);

      setMessage(`Document uploaded successfully! Document ID: ${document.id}`);
      setFile(null);

      // Navigate to processing page
      window.location.href = `/processing/${document.id}`;
    } catch (error) {
      setMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card radius-card border border-card shadow-soft">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold text-primary mb-6">
                Upload Document
              </h2>

              <form onSubmit={handleUpload} className="space-y-6">
                <div>
                  <label htmlFor="documentType" className="block text-sm font-medium text-primary">
                    Document Type
                  </label>
                  <select
                    id="documentType"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as any)}
                    className="mt-1 block w-full bg-card-secondary border border-card text-primary focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-2 radius-md transition-colors"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="receipt">Receipt</option>
                    <option value="contract">Contract</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="file" className="block text-sm font-medium text-primary">
                    File
                  </label>
                  <input
                    id="file"
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="mt-1 block w-full text-sm text-muted
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-accent-blue/20 file:text-accent-blue
                      hover:file:bg-accent-blue/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium text-white bg-primary-cta radius-lg bg-primary-cta-hover shadow-card hover:shadow-soft transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>

                {message && (
                  <div
                    className={`p-4 radius-md ${
                      message.includes('failed')
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                        : 'bg-green-500/10 border border-green-500/30 text-green-400'
                    }`}
                  >
                    {message}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
