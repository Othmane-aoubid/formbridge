'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, ReviewResponse, ReviewSubmit } from '@/lib/api';
import { wsClient } from '@/lib/websocket';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [comments, setComments] = useState('');
  const [extractedFields, setExtractedFields] = useState<ReviewResponse['extractedFields']>({});

  useEffect(() => {
    loadDocument();
    
    // Connect to WebSocket for real-time updates
    const client = wsClient();
    client.connect();
    
    client.onMessage('document_update', (message: any) => {
      console.log('Document update received:', message);
      if (message.document_id === documentId) {
        loadDocument(); // Reload document when status changes
      }
    });
    
    return () => {
      client.disconnect();
    };
  }, [documentId]);

  async function loadDocument() {
    setLoading(true);
    try {
      const doc = await apiClient.getReviewDocument(documentId);
      setDocument(doc);
      setExtractedFields(doc.extractedFields);
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const review: ReviewSubmit = {
        correctedFields: extractedFields,
        reviewerId: 'current-user',
        comments: comments || undefined,
      };

      await apiClient.submitReview(documentId, review);
      router.push('/review');
    } catch (error) {
      console.error('Failed to submit review:', error);
      setError('Failed to submit review');
    } finally {
      setSaving(false);
    }
  }

  function handleFieldChange(field: string, value: any) {
    setExtractedFields((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mb-4"></div>
            <p className="text-secondary">Loading document...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <span className="text-6xl mb-4">📄</span>
            <p className="text-secondary">Document not found</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Link href="/review" className="text-accent-blue hover:text-blue-400 transition-colors">
                    ← Back to Review Queue
                  </Link>
                </div>
                <h2 className="text-3xl font-bold text-primary">Review Document</h2>
                <p className="text-secondary mt-1">Review and correct extracted information</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 text-sm font-medium radius-md ${
                  document.status === 'needs_review' || document.status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {document.status}
                </span>
              </div>
            </div>
          </div>

          {/* Document Info Bar */}
          <div className="bg-card radius-card border border-card shadow-card mb-6 p-4">
            <div className="flex items-center text-sm">
              <span className="text-muted mr-2">📄</span>
              <span className="text-primary font-medium">{document.filename}</span>
            </div>
          </div>

          {/* Error/Success Messages */}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Document Preview */}
            <div className="bg-card radius-card border border-card shadow-card">
              <div className="px-6 py-4 border-b border-card flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Document Preview</h3>
                {document.previewUrl && (
                  <a
                    href={document.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent-blue hover:text-blue-400 transition-colors"
                  >
                    Open in new tab →
                  </a>
                )}
              </div>
              <div className="p-6">
                <div className="border border-card rounded-lg p-4 bg-card-secondary min-h-[500px]">
                  {document.previewUrl ? (
                    <iframe
                      src={document.previewUrl}
                      className="w-full h-[500px]"
                      title="Document Preview"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[500px] text-secondary">
                      <span className="text-6xl mb-4">📄</span>
                      <p>Preview not available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* OCR Text */}
            <div className="bg-card radius-card border border-card shadow-card">
              <div className="px-6 py-4 border-b border-card flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">OCR Text</h3>
                <button
                  onClick={() => {
                    const ocrText = (document as any).ocrText;
                    if (ocrText) {
                      navigator.clipboard.writeText(ocrText);
                      setSuccess('OCR text copied to clipboard');
                      setTimeout(() => setSuccess(''), 2000);
                    }
                  }}
                  className="text-sm text-accent-blue hover:text-blue-400 transition-colors"
                >
                  Copy text
                </button>
              </div>
              <div className="p-6">
                <div className="border border-card rounded-lg p-4 bg-card-secondary max-h-[500px] overflow-y-auto">
                  <pre className="text-sm text-secondary whitespace-pre-wrap">
                    {(document as any).ocrText || 'No OCR text available'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Review Form */}
            <div className="bg-card radius-card border border-card shadow-card lg:col-span-2">
              <div className="px-6 py-4 border-b border-card">
                <h3 className="text-lg font-semibold text-primary">Review Extracted Fields</h3>
                <p className="text-sm text-muted mt-1">Review and correct the extracted information below</p>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(document.extractedFields).map(([fieldName, value]) => {
                      const confidenceScore = document.confidenceScores[fieldName as keyof typeof document.confidenceScores];
                      const isDateField = fieldName.toLowerCase().includes('date');
                      const isNumberField = fieldName.toLowerCase().includes('amount') || fieldName.toLowerCase().includes('price') || fieldName.toLowerCase().includes('total');
                      const isArray = Array.isArray(value);
                      const fieldValue = extractedFields[fieldName as keyof typeof extractedFields];
                      const formattedLabel = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');

                      return (
                        <div key={fieldName}>
                          <label htmlFor={fieldName} className="block text-sm font-medium text-primary mb-2">
                            <div className="flex items-center justify-between">
                              <span>{formattedLabel}</span>
                              {confidenceScore !== undefined && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  confidenceScore >= 0.8 ? 'bg-green-500/20 text-green-400' :
                                  confidenceScore >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {(confidenceScore * 100).toFixed(0)}% confidence
                                </span>
                              )}
                            </div>
                          </label>
                          {isArray ? (
                            <div className="mt-1 p-3 bg-card-secondary border border-card radius-md">
                              <p className="text-sm text-secondary">Array field - {JSON.stringify(fieldValue)}</p>
                            </div>
                          ) : isDateField ? (
                            <input
                              id={fieldName}
                              type="date"
                              value={typeof fieldValue === 'string' ? fieldValue : ''}
                              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                              className="mt-1 block w-full bg-card-secondary border border-card text-primary focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-2 radius-md transition-colors"
                            />
                          ) : isNumberField ? (
                            <input
                              id={fieldName}
                              type="number"
                              step="0.01"
                              value={typeof fieldValue === 'number' && !isNaN(fieldValue) ? fieldValue : ''}
                              onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value))}
                              className="mt-1 block w-full bg-card-secondary border border-card text-primary focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-2 radius-md transition-colors"
                            />
                          ) : (
                            <input
                              id={fieldName}
                              type="text"
                              value={typeof fieldValue === 'string' ? fieldValue : ''}
                              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                              className="mt-1 block w-full bg-card-secondary border border-card text-primary focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-2 radius-md transition-colors"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label htmlFor="comments" className="block text-sm font-medium text-primary mb-2">
                      Review Comments
                    </label>
                    <textarea
                      id="comments"
                      rows={4}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="mt-1 block w-full bg-card-secondary border border-card text-primary focus:border-accent-blue focus:ring-accent-blue sm:text-sm border p-3 radius-md transition-colors"
                      placeholder="Add any notes about this review..."
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-card">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 flex justify-center py-3 px-4 border border-transparent text-sm font-medium text-white bg-primary-cta radius-lg bg-primary-cta-hover shadow-card hover:shadow-soft transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <span className="text-xl mr-2">✓</span>
                          Submit Review
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setRetrying(true);
                        try {
                          await apiClient.reprocessDocument(documentId);
                          await loadDocument();
                          setSuccess('Document reprocessed successfully');
                          setTimeout(() => setSuccess(''), 2000);
                        } catch (error) {
                          console.error('Failed to retry:', error);
                          setError('Failed to reprocess document');
                        } finally {
                          setRetrying(false);
                        }
                      }}
                      disabled={retrying}
                      className="flex-1 flex justify-center py-3 px-4 border border-card text-sm font-medium text-secondary bg-card-secondary hover:text-primary transition-colors radius-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {retrying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-blue mr-2"></div>
                          Reprocessing...
                        </>
                      ) : (
                        <>
                          <span className="text-xl mr-2">🔄</span>
                          Reprocess
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/review')}
                      className="flex-1 flex justify-center py-3 px-4 border border-card text-sm font-medium text-secondary bg-card-secondary hover:text-primary transition-colors radius-lg"
                    >
                      <span className="text-xl mr-2">✕</span>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
