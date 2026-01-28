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
    <div className="min-h-screen text-slate-100 pb-20 font-sans selection:bg-primary/30">
      {/* Mesh Gradients for Background depth */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]"></div>
      </div>

      <header className="glass-header">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="bg-gradient-to-tr from-primary to-secondary rounded-xl p-2.5 shadow-lg shadow-primary/20 transform group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-white leading-none">SmartReceipt <span className="text-secondary">Pro</span></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">AI Intelligence Layer</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-300">Mistral Vision Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Expense <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Reimagined</span>
            </h1>
            <p className="mt-4 text-slate-400 text-lg max-w-xl font-medium">
              Precision OCR meets generative AI. Upload your receipts and watch them transform into structured data.
            </p>
          </div>

          {filteredReceipts.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="btn-accent"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Export CSV Report
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-8">
            <section className="glass-card p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors duration-500"></div>

              <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Entry Point</h2>
                </div>
                {!showManualForm && (
                  <button
                    onClick={() => setShowManualForm(true)}
                    className="text-xs font-bold text-secondary hover:text-primary transition-colors uppercase tracking-wider bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"
                  >
                    Manual Entry
                  </button>
                )}
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
            </section>
          </div>

          <div className="lg:col-span-7 space-y-10">
            <div className="glass-card p-2">
              <StatsOverview receipts={receipts} />
            </div>

            <section>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-white">Activity Log</h2>
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                    <span className="text-xs font-bold text-slate-400">
                      {filteredReceipts.length} Entries
                    </span>
                  </div>
                </div>

                {selectedIds.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300 flex items-center gap-3">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{selectedIds.length} Selected</span>
                    <button
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-500/20 transition-all flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      Purge Selection
                    </button>
                    <button
                      onClick={() => setSelectedIds([])}
                      className="text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <ReceiptFilters
                  filters={filters}
                  onFilterChange={setFilters}
                  onClear={handleClearFilters}
                />

                <ReceiptList
                  receipts={filteredReceipts}
                  onDelete={handleDelete}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                />
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Bulk Delete Global Confirmation */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass-card max-w-sm w-full p-10 animate-in zoom-in-95 duration-300 shadow-[0_0_100px_rgba(0,0,0,0.5)] border-white/10" role="dialog" aria-modal="true">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Bulk Purge</h3>
              <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                You are about to permanently delete <span className="text-white font-bold">{selectedIds.length}</span> entry records. This operation is non-reversible.
              </p>
              <div className="flex w-full gap-4">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
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