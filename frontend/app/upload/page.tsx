'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { apiClient, DocumentCreate } from '../../lib/api';
import AppLayout from '@/components/AppLayout';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [documentType, setDocumentType] = useState<'invoice' | 'receipt' | 'contract' | 'other'>('invoice');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-primary mb-2">Upload Document</h2>
            <p className="text-secondary">Upload your documents for AI-powered processing and extraction</p>
          </div>

          <div className="bg-card radius-card border border-card shadow-card">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleUpload} className="space-y-6">
                {/* Document Type Selection */}
                <div>
                  <label htmlFor="documentType" className="block text-sm font-medium text-primary mb-2">
                    Document Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['invoice', 'receipt', 'contract', 'other'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDocumentType(type as any)}
                        className={`px-4 py-3 border radius-md text-sm font-medium transition-all duration-200 ${
                          documentType === type
                            ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                            : 'bg-card-secondary border-card text-secondary hover:border-accent-blue hover:text-primary'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload Area */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    File
                  </label>
                  <div
                    className={`relative border-2 border-dashed radius-lg p-8 text-center transition-all duration-200 ${
                      dragActive
                        ? 'border-accent-blue bg-accent-blue/10'
                        : file
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-card bg-card-secondary hover:border-accent-blue/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      id="file"
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                    
                    {file ? (
                      <div className="space-y-4">
                        <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                          <span className="text-3xl">✓</span>
                        </div>
                        <div>
                          <p className="text-primary font-medium">{file.name}</p>
                          <p className="text-secondary text-sm">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-sm text-accent-blue hover:text-blue-400 transition-colors"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="h-16 w-16 rounded-full bg-accent-blue/20 flex items-center justify-center mx-auto">
                          <span className="text-3xl">📄</span>
                        </div>
                        <div>
                          <p className="text-primary font-medium">Drag and drop your file here</p>
                          <p className="text-secondary text-sm">or click to browse</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-md text-sm font-medium hover:bg-accent-blue/30 transition-colors"
                        >
                          Choose file
                        </button>
                        <p className="text-xs text-muted">
                          Supported formats: PDF, JPG, JPEG, PNG (Max 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Button */}
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium text-white bg-primary-cta radius-lg bg-primary-cta-hover shadow-card hover:shadow-soft transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <span className="text-xl mr-2">📤</span>
                      Upload Document
                    </>
                  )}
                </button>

                {/* Message */}
                {message && (
                  <div
                    className={`p-4 radius-md ${
                      message.includes('failed')
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                        : 'bg-green-500/10 border border-green-500/30 text-green-400'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-xl mr-2">{message.includes('failed') ? '✕' : '✓'}</span>
                      {message}
                    </div>
                  </div>
                )}
              </form>

              {/* Info Section */}
              <div className="mt-6 pt-6 border-t border-card">
                <h3 className="text-sm font-medium text-primary mb-3">What happens next?</h3>
                <div className="space-y-2 text-sm text-secondary">
                  <div className="flex items-start">
                    <span className="text-accent-blue mr-2">1.</span>
                    <span>Your document will be uploaded to secure Azure Storage</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-accent-blue mr-2">2.</span>
                    <span>AI will process the document and extract key information</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-accent-blue mr-2">3.</span>
                    <span>Review the extracted data and make corrections if needed</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-accent-blue mr-2">4.</span>
                    <span>Search and retrieve documents anytime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
