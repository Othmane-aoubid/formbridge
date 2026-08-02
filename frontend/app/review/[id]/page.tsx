'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, ReviewResponse, ReviewSubmit } from '@/lib/api';
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
              <button
                onClick={() => setError('')}
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
              >
                <span className="text-red-500">&times;</span>
              </button>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{success}</span>
              <button
                onClick={() => setSuccess('')}
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
              >
                <span className="text-green-500">&times;</span>
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Document Preview */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Document Preview
                </h2>
                <div className="border rounded-lg p-4 bg-gray-50">
                  {document.previewUrl ? (
                    <iframe
                      src={document.previewUrl}
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
            </div>

            {/* OCR Text */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  OCR Text
                </h2>
                <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {(document as any).ocrText || 'No OCR text available'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Review Form */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Review Extracted Fields
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {Object.entries(document.extractedFields).map(([fieldName, value]) => {
                    const confidenceScore = document.confidenceScores[fieldName as keyof typeof document.confidenceScores];
                    const isDateField = fieldName.toLowerCase().includes('date');
                    const isNumberField = fieldName.toLowerCase().includes('amount') || fieldName.toLowerCase().includes('price') || fieldName.toLowerCase().includes('total');
                    const isArray = Array.isArray(value);
                    const fieldValue = extractedFields[fieldName as keyof typeof extractedFields];

                    return (
                      <div key={fieldName}>
                        <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700">
                          {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')}
                          {confidenceScore && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({(confidenceScore * 100).toFixed(0)}% confidence)
                            </span>
                          )}
                        </label>
                        {isArray ? (
                          <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                            <p className="text-sm text-gray-600">Array field - {JSON.stringify(fieldValue)}</p>
                          </div>
                        ) : isDateField ? (
                          <input
                            id={fieldName}
                            type="date"
                            value={typeof fieldValue === 'string' ? fieldValue : ''}
                            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          />
                        ) : isNumberField ? (
                          <input
                            id={fieldName}
                            type="number"
                            step="0.01"
                            value={typeof fieldValue === 'number' ? fieldValue : ''}
                            onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          />
                        ) : (
                          <input
                            id={fieldName}
                            type="text"
                            value={typeof fieldValue === 'string' ? fieldValue : ''}
                            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          />
                        )}
                      </div>
                    );
                  })}

                  <div>
                    <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                      Comments
                    </label>
                    <textarea
                      id="comments"
                      rows={3}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      placeholder="Add any notes about this review..."
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setRetrying(true);
                        try {
                          await apiClient.reprocessDocument(documentId);
                          await loadDocument();
                        } catch (error) {
                          console.error('Failed to retry:', error);
                        } finally {
                          setRetrying(false);
                        }
                      }}
                      disabled={retrying}
                      className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {retrying ? 'Retrying...' : 'Retry'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/review')}
                      className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
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
