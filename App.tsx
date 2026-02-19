import React, { useState, useEffect, useMemo } from 'react';
import { UploadSection } from './components/UploadSection';
import { ReceiptList } from './components/ReceiptList';
import { StatsOverview } from './components/StatsOverview';
import { ManualEntryForm } from './components/ManualEntryForm';
import { ReceiptFilters, FilterCriteria } from './components/ReceiptFilters';
import { processAndSaveReceipt, saveManualReceiptToDB, fetchReceiptsFromDB, deleteReceiptFromDB, deleteReceiptsFromDB } from './services/awsService';
import { ReceiptData, ProcessingStatus } from './types';

const initialFilters: FilterCriteria = {
  search: '',
  minAmount: '',
  maxAmount: '',
  startDate: '',
  endDate: '',
};

function App() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, step: 'idle' });
  const [showManualForm, setShowManualForm] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>(initialFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchReceiptsFromDB();
        setReceipts(data);
      } catch (e) {
        console.error("Failed to fetch from backend", e);
      }
    };
    loadData();
  }, []);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const matchesSearch = receipt.merchantName.toLowerCase().includes(filters.search.toLowerCase());
      const minVal = filters.minAmount ? parseFloat(filters.minAmount) : -Infinity;
      const maxVal = filters.maxAmount ? parseFloat(filters.maxAmount) : Infinity;
      const matchesAmount = receipt.total >= minVal && receipt.total <= maxVal;
      const dateVal = new Date(receipt.date).getTime();
      const startVal = filters.startDate ? new Date(filters.startDate).getTime() : -Infinity;
      const endVal = filters.endDate ? new Date(filters.endDate).getTime() : Infinity;
      const matchesDate = dateVal >= startVal && dateVal <= endVal;
      return matchesSearch && matchesAmount && matchesDate;
    });
  }, [receipts, filters]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setStatus({ isProcessing: true, step: 'analyzing', message: 'Uploading to cloud for AI analysis...' });

    try {
      // Backend now handles S3, Mistral OCR, and DynamoDB in one go
      const processedReceipt = await processAndSaveReceipt(file);

      setReceipts(prev => [processedReceipt, ...prev]);
      setStatus({ isProcessing: false, step: 'complete' });

    } catch (error: any) {
      console.error(error);
      setStatus({
        isProcessing: false,
        step: 'error',
        message: error.message || 'Server error during AI processing.'
      });
    }
  };

  const handleManualSave = async (data: Partial<ReceiptData>, file?: File) => {
    setStatus({ isProcessing: true, step: 'uploading', message: 'Saving manual entry...' });

    try {
      const newReceipt = await saveManualReceiptToDB(data, file);
      setReceipts(prev => [newReceipt, ...prev]);
      setStatus({ isProcessing: false, step: 'complete' });
      setShowManualForm(false);
    } catch (error: any) {
      console.error(error);
      setStatus({
        isProcessing: false,
        step: 'error',
        message: error.message || 'Failed to save manually.'
      });
    }
  };

  const handleDelete = async (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
    setSelectedIds(prev => prev.filter(selId => selId !== id));
    try {
      await deleteReceiptFromDB(id);
    } catch (e) {
      console.error("Deletion failed", e);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredReceipts.length && filteredReceipts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReceipts.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const idsToDelete = [...selectedIds];
    setReceipts(prev => prev.filter(r => !idsToDelete.includes(r.id)));
    setSelectedIds([]);
    setShowBulkDeleteConfirm(false);

    try {
      await deleteReceiptsFromDB(idsToDelete);
    } catch (e) {
      console.error("Bulk deletion failed", e);
      // Optional: re-fetch or show error toast
    }
  };

  const handleClearFilters = () => setFilters(initialFilters);

  const handleExportCSV = () => {
    if (filteredReceipts.length === 0) return;
    const headers = ['ID', 'Merchant Name', 'Date', 'Total', 'Currency'];
    const rows = filteredReceipts.map(r => [
      `"${r.id}"`, `"${r.merchantName}"`, `"${r.date}"`, r.total, `"${r.currency}"`
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen text-slate-700 pb-12 font-sans selection:bg-primary/20">
      {/* Soft Gradient Blurs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/8 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/8 rounded-full blur-[120px]"></div>
      </div>

      <header className="glass-header">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 group cursor-pointer">
            <div className="bg-lavender-50 rounded-lg p-1.5 transition-transform duration-300">
              <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <span className="font-semibold text-lg tracking-tight text-slate-700">SmartReceipt <span className="text-primary font-normal">Pro</span></span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleExportCSV} className="text-xs font-medium text-slate-400 hover:text-primary transition-colors cursor-pointer">
              Export CSV
            </button>
            <div className="w-px h-4 bg-pink-100"></div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              <span className="text-xs font-medium text-slate-400">System Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT PANEL: DASHBOARD */}
          <div className="lg:col-span-4 space-y-3 sticky top-20">
            <div className="space-y-0.5 mb-3">
              <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Dashboard</h1>
              <p className="text-xs text-slate-400">Overview & Actions</p>
            </div>

            {/* Stats Card */}
            <div className="glass-card">
              <StatsOverview receipts={receipts} />
            </div>

            {/* Upload/Entry Card */}
            <div className="glass-card p-4 overflow-hidden relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Input Source</h2>
                <button
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="text-xs text-primary hover:text-primary/70 transition-colors cursor-pointer"
                >
                  {showManualForm ? 'Switch to Upload' : 'Switch to Manual'}
                </button>
              </div>

              {showManualForm ? (
                <ManualEntryForm
                  onSave={handleManualSave}
                  onCancel={() => setShowManualForm(false)}
                  isSubmitting={status.isProcessing}
                />
              ) : (
                <UploadSection onFileSelect={handleFileUpload} status={status} />
              )}
            </div>
          </div>

          {/* RIGHT PANEL: ACTIVITY LOG */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex justify-between items-end mb-3">
              <div className="space-y-0.5">
                <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Activity Log</h2>
                <p className="text-xs text-slate-400">Recent Transactions</p>
              </div>

              {selectedIds.length > 0 && (
                <div className="animate-in fade-in slide-in-from-right-2 duration-200 flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                  <span className="text-xs font-medium text-rose-500">{selectedIds.length} Selected</span>
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    PURGE
                  </button>
                  <div className="w-px h-3 bg-rose-200"></div>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-xs text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    X
                  </button>
                </div>
              )}
            </div>

            {/* Filters & List */}
            <div className="space-y-3">
              <ReceiptFilters
                filters={filters}
                onFilterChange={setFilters}
                onClear={handleClearFilters}
              />

              <div className="glass-card min-h-[400px]">
                <ReceiptList
                  receipts={filteredReceipts}
                  onDelete={handleDelete}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bulk Delete Global Confirmation */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-card max-w-sm w-full p-8 animate-in zoom-in-95 duration-300 shadow-glass-lg border-rose-100" role="dialog" aria-modal="true">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-5 text-rose-500 border border-rose-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Bulk Purge</h3>
              <p className="text-slate-500 font-medium mb-6 leading-relaxed text-sm">
                You are about to permanently delete <span className="text-slate-800 font-bold">{selectedIds.length}</span> entry records. This operation is non-reversible.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-blush text-slate-500 font-semibold rounded-xl transition-all border border-pink-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;