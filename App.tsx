import React, { useState, useEffect, useMemo } from 'react';
import { UploadSection } from './components/UploadSection';
import { ReceiptList } from './components/ReceiptList';
import { StatsOverview } from './components/StatsOverview';
import { ManualEntryForm } from './components/ManualEntryForm';
import { ReceiptFilters, FilterCriteria } from './components/ReceiptFilters';
import { processAndSaveReceipt, confirmDuplicateReceiptDecision, saveManualReceiptToDB, fetchReceiptsFromDB, deleteReceiptFromDB, deleteReceiptsFromDB } from './services/receiptService';
import { AuthForm } from './components/AuthForm';
import { getAuthService } from './services/authService';
import type { Session } from '@supabase/supabase-js';
import { ReceiptData, ProcessingStatus } from './types';

const initialFilters: FilterCriteria = {
  search: '',
  minAmount: '',
  maxAmount: '',
  startDate: '',
  endDate: '',
};

const aiModelOptions = [
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'qwen/qwen3.6-flash', label: 'Qwen3.6 Flash' },
  { id: 'pixtral-12b-2409', label: 'Pixtral 12B (Mistral)' },
];

const defaultAiModelId = 'google/gemini-2.5-flash';

function App() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, step: 'idle' });
  const [showManualForm, setShowManualForm] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>(initialFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(defaultAiModelId);
  const [duplicatePrompt, setDuplicatePrompt] = useState<null | {
    candidateReceipt: Pick<ReceiptData, 'id' | 'merchantName' | 'date' | 'total' | 'currency'>;
    pendingReceipt: ReceiptData;
    matchType: 'imageHash' | 'ocrFingerprint';
  }>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const refreshReceiptsAfterDelete = async (deletedIds: string[]) => {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const data = await fetchReceiptsFromDB();
      const stillPresent = data.some(r => deletedIds.includes(r.id));
      if (!stillPresent) {
        setReceipts(data);
        return true;
      }
      if (attempt < maxAttempts - 1) {
        await sleep(500 * (attempt + 1));
      }
    }

    // Keep UI consistent while signaling that delete did not persist server-side.
    setReceipts(prev => prev.filter(r => !deletedIds.includes(r.id)));
    setStatus({
      isProcessing: false,
      step: 'error',
      message: 'Delete did not persist. Please refresh and try again.'
    });
    return false;
  };

  useEffect(() => {
    const auth = getAuthService();
    auth.getSession()
      .then(setSession)
      .catch(err => console.error('Failed to read session', err))
      .finally(() => setAuthReady(true));
    const unsubscribe = auth.onAuthStateChange((s) => setSession(s));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowBulkDeleteConfirm(false);
        setDuplicatePrompt(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!session) {
      setReceipts([]);
      return;
    }
    const loadData = async () => {
      try {
        const data = await fetchReceiptsFromDB();
        setReceipts(data);
      } catch (e) {
        console.error("Failed to fetch from backend", e);
      }
    };
    loadData();
  }, [session]);

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
    setStatus({ isProcessing: true, step: 'uploading', message: 'Optimizing and uploading receipt...' });

    try {
      // Backend now handles S3, Mistral OCR, and DynamoDB in one go
      const result = await processAndSaveReceipt(file, { modelId: selectedModelId });

      // If backend detects a likely duplicate, prompt the user to confirm
      if (typeof result === 'object' && result !== null && 'duplicateDetected' in result && (result as any).duplicateDetected) {
        const dup = result as any;
        setDuplicatePrompt({
          candidateReceipt: dup.candidateReceipt,
          pendingReceipt: dup.pendingReceipt,
          matchType: dup.matchType,
        });
        setStatus({ isProcessing: false, step: 'idle' });
        return;
      }

      const processedReceipt = result as ReceiptData;
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

  const handleDuplicateDecision = async (decision: 'ignore' | 'save') => {
    if (!duplicatePrompt) return;
    setStatus({ isProcessing: true, step: 'uploading', message: decision === 'save' ? 'Saving receipt...' : 'Ignoring duplicate...' });

    try {
      const result = await confirmDuplicateReceiptDecision(decision, duplicatePrompt.pendingReceipt);
      if (decision === 'save') {
        setReceipts(prev => [result as ReceiptData, ...prev]);
      }
      setDuplicatePrompt(null);
      setStatus({ isProcessing: false, step: 'complete' });
    } catch (error: any) {
      console.error(error);
      setStatus({
        isProcessing: false,
        step: 'error',
        message: error.message || 'Failed to confirm duplicate decision.'
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
    const previousReceipts = receipts;
    setStatus({ isProcessing: true, step: 'uploading', message: 'Deleting receipt...' });
    try {
      await deleteReceiptFromDB(id);
      setSelectedIds(prev => prev.filter(selId => selId !== id));
      await refreshReceiptsAfterDelete([id]);
      setStatus({ isProcessing: false, step: 'complete' });
    } catch (e) {
      console.error("Deletion failed", e);
      setReceipts(previousReceipts);
      setStatus({
        isProcessing: false,
        step: 'error',
        message: e?.message || 'Delete failed. Please try again.'
      });
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
    const previousReceipts = receipts;
    setShowBulkDeleteConfirm(false);
    setStatus({ isProcessing: true, step: 'uploading', message: 'Deleting receipts...' });

    try {
      await deleteReceiptsFromDB(idsToDelete);
      setSelectedIds([]);
      await refreshReceiptsAfterDelete(idsToDelete);
      setStatus({ isProcessing: false, step: 'complete' });
    } catch (e) {
      console.error("Bulk deletion failed", e);
      setReceipts(previousReceipts);
      setStatus({
        isProcessing: false,
        step: 'error',
        message: 'Bulk delete failed. Please try again.'
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await getAuthService().signOut();
    } catch (e) {
      console.error('Sign out failed', e);
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

  const bulkDeleteInProgress = status.isProcessing && typeof status.message === 'string' && status.message.toLowerCase().includes('deleting receipts');
  const bulkDeleteFailed = status.step === 'error' && typeof status.message === 'string' && status.message.toLowerCase().includes('bulk delete');

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm font-sans">Loading…</div>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.startDate || filters.endDate || filters.minAmount || filters.maxAmount
  );

  return (
    <div className="min-h-screen text-slate-700 pb-12 font-sans selection:bg-primary/20">
      {/* Soft Gradient Blurs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/8 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/8 rounded-full blur-[120px]"></div>
      </div>

      <header className="glass-header">
        <div className="max-w-[1600px] mx-auto px-4 py-2.5 sm:py-0 sm:h-16 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center space-x-2.5 group cursor-pointer" data-testid="logo">
            <div className="bg-gradient-to-br from-pink-100 to-lavender-100 rounded-xl p-2 shadow-2xs border border-pink-200/50 transition-transform duration-200 group-hover:scale-105">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-800">SmartReceipt <span className="text-primary font-medium">Pro</span></span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold text-secondary uppercase tracking-widest bg-lavender-50 px-2 py-0.5 rounded-full border border-lavender-100">AI Powered</span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white/90 hover:bg-blush text-slate-600 hover:text-primary border border-pink-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Export filtered transactions as CSV file"
            >
              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            <div className="hidden sm:block w-px h-4 bg-pink-200/60"></div>

            {/* System Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200/60 px-2.5 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">Online</span>
            </div>

            <div className="w-px h-4 bg-pink-200/60"></div>

            {/* User Profile & Sign Out */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-lavender-100 border border-lavender-200 text-secondary text-xs font-bold flex items-center justify-center shadow-2xs">
                {session.user?.email ? session.user.email[0].toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-medium text-slate-600 max-w-[120px] sm:max-w-[160px] truncate hidden sm:inline">
                {session.user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT PANEL: DASHBOARD & ENTRY */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
            {/* Stats Card */}
            <div className="glass-card shadow-sm">
              <StatsOverview receipts={receipts} />
            </div>

            {/* Upload/Entry Card with Segmented Switcher */}
            <div className="glass-card p-4 shadow-sm overflow-hidden relative">
              <div className="flex bg-slate-100/80 p-1 rounded-xl mb-4 border border-pink-100/60">
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !showManualForm
                      ? 'bg-white text-slate-800 shadow-2xs border border-pink-100/80'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>AI Scanner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualForm(true)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    showManualForm
                      ? 'bg-white text-slate-800 shadow-2xs border border-pink-100/80'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Manual Entry</span>
                </button>
              </div>

              {showManualForm ? (
                <ManualEntryForm
                  onSave={handleManualSave}
                  onCancel={() => setShowManualForm(false)}
                  isSubmitting={status.isProcessing}
                />
              ) : (
                <UploadSection
                  onFileSelect={handleFileUpload}
                  status={status}
                  modelId={selectedModelId}
                  modelOptions={aiModelOptions}
                  onModelChange={setSelectedModelId}
                />
              )}
            </div>
          </div>

          {/* RIGHT PANEL: ACTIVITY LOG */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Activity Log</h2>
                <p className="text-xs text-slate-500">Transaction history & OCR extractions</p>
              </div>

              {selectedIds.length > 0 && (
                <div className="animate-in fade-in slide-in-from-right-2 duration-200 flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs">
                  <span className="text-xs font-bold text-rose-600">{selectedIds.length} Selected</span>
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    PURGE
                  </button>
                  {(bulkDeleteInProgress || bulkDeleteFailed) && (
                    <div className={`flex items-center gap-1 text-[11px] font-semibold ${bulkDeleteFailed ? 'text-amber-600' : 'text-rose-500'}`}>
                      {bulkDeleteFailed ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                      ) : (
                        <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin"></span>
                        </span>
                      )}
                      <span>{bulkDeleteFailed ? 'Delete failed' : 'Deleting...'}</span>
                    </div>
                  )}
                  <div className="w-px h-3.5 bg-rose-200"></div>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors cursor-pointer px-1"
                    title="Deselect all"
                  >
                    ✕
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

              <div className="glass-card min-h-[420px] shadow-sm">
                <ReceiptList
                  receipts={filteredReceipts}
                  onDelete={handleDelete}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={handleClearFilters}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Duplicate confirmation prompt */}
      {duplicatePrompt && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border-pink-200 shadow-glass-lg bg-white/95">
            <h3 className="text-base font-bold text-slate-800 mb-1.5">Possible Duplicate Receipt</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              We found an existing receipt with matching characteristics. Please confirm whether this is a duplicate or a new transaction.
            </p>

            <div className="bg-white rounded-xl p-3.5 mb-5 border border-pink-100 shadow-2xs">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Existing Record</div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{duplicatePrompt.candidateReceipt.merchantName}</div>
                  <div className="text-xs text-slate-400 font-mono">{duplicatePrompt.candidateReceipt.date}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-slate-800 font-mono">
                    {Number(duplicatePrompt.candidateReceipt.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400">{duplicatePrompt.candidateReceipt.currency}</div>
                </div>
              </div>
              <div className="mt-2.5 text-[11px] text-slate-500 bg-pink-50/50 px-2 py-1 rounded-md">
                Match Type: <span className="font-semibold text-slate-700">{duplicatePrompt.matchType === 'imageHash' ? 'Identical image checksum' : 'Matching merchant, date & total'}</span>
              </div>
            </div>

            <div className="flex w-full gap-2.5">
              <button
                onClick={() => handleDuplicateDecision('ignore')}
                className="flex-1 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-colors border border-emerald-200 cursor-pointer"
                disabled={status.isProcessing}
              >
                Yes (Duplicate) — Ignore
              </button>
              <button
                onClick={() => handleDuplicateDecision('save')}
                className="flex-1 py-2.5 px-3 bg-white hover:bg-blush text-slate-700 text-xs font-bold rounded-xl transition-colors border border-pink-200 cursor-pointer"
                disabled={status.isProcessing}
              >
                No — Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Global Confirmation */}
      {showBulkDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 shadow-glass-lg border-rose-100 bg-white/95">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-4 text-rose-500 border border-rose-200 shadow-2xs">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1.5">Bulk Purge</h3>
              <p className="text-slate-500 font-medium mb-6 leading-relaxed text-xs">
                You are about to permanently delete <span className="text-slate-800 font-bold">{selectedIds.length}</span> entry records. This operation is irreversible.
              </p>
              <div className="flex w-full gap-2.5">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-blush text-slate-600 font-semibold rounded-xl transition-all border border-pink-100 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-all shadow-sm text-xs cursor-pointer"
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