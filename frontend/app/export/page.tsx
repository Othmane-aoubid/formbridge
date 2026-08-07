'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { 
  Download, 
  Calendar, 
  Filter, 
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Search
} from 'lucide-react';

export default function ExportPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const docsResponse = await apiClient.searchDocuments({ limit: 100 });
      setDocuments(docsResponse.results || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load documents');
      setLoading(false);
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = documentTypeFilter === 'all' || doc.documentType === documentTypeFilter;
    const matchesDateFrom = !dateFrom || new Date(doc.createdAt) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(doc.createdAt) <= new Date(dateTo);
    return matchesStatus && matchesType && matchesDateFrom && matchesDateTo;
  });

  function toggleDocumentSelection(docId: string) {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocuments(newSelection);
  }

  function toggleSelectAll() {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  }

  async function handleExport() {
    if (selectedDocuments.size === 0) {
      setError('Please select at least one document to export');
      return;
    }
    setExporting(true);
    setError('');
    setSuccess('');
    try {
      const documentIds = Array.from(selectedDocuments);
      const blob = await apiClient.exportDocumentsBatch(documentIds, exportFormat);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      a.download = `documents_export_${timestamp}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess(`Successfully exported ${documentIds.length} documents as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to export documents:', error);
      setError('Failed to export documents');
    } finally {
      setExporting(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
      case 'validated':
        return { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle size={12} /> };
      case 'processing':
      case 'ingested':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <Clock size={12} /> };
      case 'failed':
        return { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle size={12} /> };
      case 'needs_review':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Clock size={12} /> };
      default:
        return { bg: 'bg-card-secondary', text: 'text-muted', icon: <Clock size={12} /> };
    }
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">Export Documents</h1>
          <p className="text-secondary">Select documents and export them in your preferred format</p>
        </div>

        {/* Filters */}
        <div className="bg-card radius-card border border-card shadow-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-accent-blue" />
            <h2 className="text-lg font-semibold text-primary">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-secondary mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-card-secondary border border-card radius-md px-4 py-2 text-primary focus:outline-none focus:border-accent-blue"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="needs_review">Needs Review</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-2">Document Type</label>
              <select
                value={documentTypeFilter}
                onChange={(e) => setDocumentTypeFilter(e.target.value)}
                className="w-full bg-card-secondary border border-card radius-md px-4 py-2 text-primary focus:outline-none focus:border-accent-blue"
              >
                <option value="all">All Types</option>
                <option value="invoice">Invoice</option>
                <option value="receipt">Receipt</option>
                <option value="contract">Contract</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-2">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-card-secondary border border-card radius-md px-4 py-2 text-primary focus:outline-none focus:border-accent-blue"
              />
            </div>

            <div>
              <label className="block text-sm text-secondary mb-2">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-card-secondary border border-card radius-md px-4 py-2 text-primary focus:outline-none focus:border-accent-blue"
              />
            </div>
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

        {/* Export Options */}
        <div className="bg-card radius-card border border-card shadow-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Download size={20} className="text-accent-blue" />
            <h2 className="text-lg font-semibold text-primary">Export Options</h2>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm text-secondary mb-2">Export Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full bg-card-secondary border border-card radius-md px-4 py-2 text-primary focus:outline-none focus:border-accent-blue"
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel (XLSX)</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm text-secondary mb-2">Selected Documents</label>
              <div className="text-primary font-medium">{selectedDocuments.size} of {filteredDocuments.length}</div>
            </div>

            <div className="flex-1 flex items-end">
              <button
                onClick={handleExport}
                disabled={selectedDocuments.size === 0 || exporting}
                className={`w-full bg-primary-cta hover:bg-primary-cta-hover text-primary font-medium radius-md px-6 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export Selected'}
              </button>
            </div>
          </div>
        </div>

        {/* Document List */}
        <div className="bg-card radius-card border border-card shadow-card">
          <div className="px-6 py-4 border-b border-card flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-card bg-card-secondary accent-accent-blue"
              />
              <h3 className="text-lg font-semibold text-primary">
                Documents ({filteredDocuments.length})
              </h3>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center text-secondary">Loading the documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-6 text-center text-secondary">No documents found matching the filters</div>
          ) : (
            <div className="divide-y divide-card">
              {filteredDocuments.map((doc: any) => {
                const statusStyle = getStatusBadge(doc.status);
                const isSelected = selectedDocuments.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`px-6 py-4 hover:bg-card-secondary transition-colors ${isSelected ? 'bg-card-secondary' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="w-4 h-4 rounded border-card bg-card-secondary accent-accent-blue"
                      />
                      
                      <div className="h-10 w-10 rounded bg-accent-blue/20 flex items-center justify-center">
                        <FileText size={20} className="text-blue-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-primary truncate">{doc.filename}</div>
                        <div className="text-xs text-secondary">{doc.documentType || 'Unknown'}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-semibold radius-md ${statusStyle.bg} ${statusStyle.text}`}>
                          <span className="mr-1">{statusStyle.icon}</span>
                          {doc.status}
                        </span>
                      </div>

                      <div className="text-sm text-secondary">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
