'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, DocumentResponse } from '@/lib/api';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useNotifications } from '@/components/NotificationContext';

export default function DocumentProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const { addNotification } = useNotifications();

  const [document, setDocument] = useState<DocumentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  useEffect(() => {
    // Show notification when processing completes
    if (previousStatus === 'processing' && document && document.status !== 'processing') {
      if (document.status === 'completed') {
        addNotification(`Document "${document.filename}" processing completed successfully!`, 'success');
      } else if (document.status === 'needs_review') {
        addNotification(`Document "${document.filename}" needs review`, 'info');
      } else if (document.status === 'failed') {
        addNotification(`Document "${document.filename}" processing failed`, 'error');
      }
    }
    setPreviousStatus(document?.status || null);
  }, [document?.status, document?.filename]);

  async function loadDocument() {
    setLoading(true);
    try {
      const doc = await apiClient.getDocument(documentId);
      setDocument(doc);
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReprocess() {
    setProcessing(true);
    try {
      await apiClient.reprocessDocument(documentId);
      loadDocument();
    } catch (err) {
      console.error('Failed to reprocess document');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Document not found</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push('/processing')}
              className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
            >
              ← Back to Processing
            </button>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{document.filename}</h2>
                <p className="text-gray-600">Document Type: {document.documentType}</p>
                <p className="text-gray-600">Status: {document.status}</p>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Status</h3>

                {document.status === 'processing' ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-full max-w-md mb-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-yellow-800">
                            {(document as any).processingStep || 'Processing...'}
                          </span>
                          <span className="text-sm font-medium text-yellow-800">
                            {(document as any).processingProgress || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-yellow-200 rounded-full h-4">
                          <div
                            className="bg-yellow-600 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${(document as any).processingProgress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <p className="text-yellow-800 text-lg font-medium">Document is currently being processed...</p>
                    </div>
                  </div>
                ) : document.status === 'completed' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">Document processing completed successfully</p>
                    <Link
                      href={`/review/${documentId}`}
                      className="mt-3 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                    >
                      Review Document →
                    </Link>
                  </div>
                ) : document.status === 'failed' ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">Document processing failed</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-800">Document is ready for processing</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button
                  onClick={handleReprocess}
                  disabled={processing || document.status === 'processing'}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Reprocess Document'}
                </button>
              </div>

              {/* Document Preview */}
              {document.status !== 'processing' && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Document Preview</h3>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    {(document as any).previewUrl ? (
                      <iframe
                        src={(document as any).previewUrl}
                        className="w-full h-96"
                        title="Document Preview"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-96 text-gray-500">
                        Preview not available
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OCR Text */}
              {document.status !== 'processing' && (document as any).ocrText && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">OCR Text</h3>
                  <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {(document as any).ocrText}
                    </pre>
                  </div>
                </div>
              )}

              {/* Extracted Fields */}
              {document.status !== 'processing' && (document as any).extractedFields && Object.keys((document as any).extractedFields).length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Extracted Fields</h3>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    {Object.entries((document as any).extractedFields).map(([key, value]) => (
                      <div key={key} className="mb-2">
                        <span className="font-medium text-gray-700">{key}:</span>
                        <span className="ml-2 text-gray-600">{Array.isArray(value) ? JSON.stringify(value) : String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
