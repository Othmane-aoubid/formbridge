'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, ReviewResponse, ReviewSubmit } from '@/lib/api';

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  
  const [document, setDocument] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        reviewerId: 'current-user', // In production, get from auth
        comments: comments || undefined,
      };

      await apiClient.submitReview(documentId, review);
      router.push('/review');
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Document not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => router.push('/review')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Queue
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Preview */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Document Preview
              </h2>
              <div className="border rounded-lg p-4 bg-gray-50">
                <iframe
                  src={document.previewUrl}
                  className="w-full h-96"
                  title="Document Preview"
                />
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
                <div>
                  <label htmlFor="vendorName" className="block text-sm font-medium text-gray-700">
                    Vendor Name
                    {document.confidenceScores.vendorName && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({(document.confidenceScores.vendorName * 100).toFixed(0)}% confidence)
                      </span>
                    )}
                  </label>
                  <input
                    id="vendorName"
                    type="text"
                    value={extractedFields.vendorName || ''}
                    onChange={(e) => handleFieldChange('vendorName', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                </div>

                <div>
                  <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">
                    Invoice Number
                    {document.confidenceScores.invoiceNumber && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({(document.confidenceScores.invoiceNumber * 100).toFixed(0)}% confidence)
                      </span>
                    )}
                  </label>
                  <input
                    id="invoiceNumber"
                    type="text"
                    value={extractedFields.invoiceNumber || ''}
                    onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                </div>

                <div>
                  <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700">
                    Invoice Date
                    {document.confidenceScores.invoiceDate && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({(document.confidenceScores.invoiceDate * 100).toFixed(0)}% confidence)
                      </span>
                    )}
                  </label>
                  <input
                    id="invoiceDate"
                    type="date"
                    value={extractedFields.invoiceDate || ''}
                    onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                </div>

                <div>
                  <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700">
                    Total Amount
                    {document.confidenceScores.totalAmount && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({(document.confidenceScores.totalAmount * 100).toFixed(0)}% confidence)
                      </span>
                    )}
                  </label>
                  <input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={extractedFields.totalAmount || ''}
                    onChange={(e) => handleFieldChange('totalAmount', parseFloat(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                </div>

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
  );
}
