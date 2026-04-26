import React, { useState, useEffect, useMemo } from 'react';
import { UploadSection } from './components/UploadSection';
import { ReceiptList } from './components/ReceiptList';
import { StatsOverview } from './components/StatsOverview';
import { ManualEntryForm } from './components/ManualEntryForm';
import { ReceiptFilters, FilterCriteria } from './components/ReceiptFilters';
import { processAndSaveReceipt, confirmDuplicateReceiptDecision, saveManualReceiptToDB, fetchReceiptsFromDB, deleteReceiptFromDB, deleteReceiptsFromDB } from './services/awsService';
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
  { id: 'qwen/qwen-vl-plus', label: 'Qwen VL Plus' },
  { id: 'pixtral-12b-2409', label: 'Pixtral 12B (Mistral)' },
  { id: 'qwen/qwen3-vl-235b-a22b-instruct', label: 'Qwen3 VL 235B' },
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

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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
    <div className="min-h-screen bg-background text-foreground pb-20 font-sans selection:bg-accent/30">
      {/* Dynamic Background Noise/Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[160px] opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[160px] opacity-30"></div>
      </div>

      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4 group cursor-pointer">
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-2 shadow-[0_0_15px_rgba(37,99,235,0.1)] transform group-hover:scale-105 transition-transform duration-300">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold text-lg tracking-tight text-foreground leading-none">SmartReceipt<span className="text-accent underline decoration-accent/30 underline-offset-4 ml-1">Pro</span></span>
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5">Intelligence Kernel v1.0</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 bg-white/[0.03] hover:bg-accent/10 text-slate-500 hover:text-accent rounded-xl border border-white/5 hover:border-accent/30 transition-all shadow-inner group/theme"
              title={theme === 'dark' ? 'Activate Day Mode' : 'Activate Night Mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 group-hover/theme:rotate-90 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707.707M12 5a7 7 0 100 14 7 7 0 000-14z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 group-hover/theme:-rotate-12 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
              )}
            </button>
            <div className="flex items-center gap-2.5 bg-white/[0.03] px-3.5 py-1.5 rounded-full border border-white/5 shadow-inner">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Vision Engine: Mistral</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-20">
          <div className="inline-block relative mb-6">
            <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full"></div>
            <h1 className="relative text-5xl md:text-6xl font-black text-foreground tracking-tighter leading-none">
              Expense <span className="text-accent">Reimagined</span>
            </h1>
          </div>
          <p className="mt-6 text-slate-400 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
            Precision OCR meets high-density intelligence. Upload your documents and extract semantic data in milliseconds.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {filteredReceipts.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="btn-secondary h-11 text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Generate CSV Summary
              </button>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto space-y-16">
          <section className="glass-card p-1 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-accent/10 transition-all duration-700"></div>

            <div className="p-8 relative z-10">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-xl">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Entry Portal</h2>
                </div>
                {!showManualForm && (
                  <button
                    onClick={() => setShowManualForm(true)}
                    className="text-[10px] font-black text-slate-500 hover:text-accent transition-all uppercase tracking-[0.15em] px-4 py-2 rounded-lg border border-white/5 hover:border-accent/30 hover:bg-accent/5"
                  >
                    Manual Override
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
                <UploadSection
                  onFileSelect={handleFileUpload}
                  status={status}
                  modelId={selectedModelId}
                  modelOptions={aiModelOptions}
                  onModelChange={setSelectedModelId}
                />
              )}
            </div>
          </section>

          <div className="space-y-16">
            <StatsOverview receipts={receipts} />

            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">Intelligence Log</h2>
                  <div className="flex items-center gap-2.5 bg-white/[0.03] px-3 py-1 rounded-full border border-white/5">
                    <span className="text-[10px] font-mono font-black text-slate-500 tracking-wider">
                      {filteredReceipts.length} NODES
                    </span>
                  </div>
                </div>

                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-3 duration-300">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{selectedIds.length} Marked</span>
                    <button
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-500/20 transition-all flex items-center gap-2"
                    >
                      Purge Stack
                    </button>
                    <button
                      onClick={() => setSelectedIds([])}
                      className="text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-10">
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
            </section>
          </div>
        </div>
      </main>

      {/* Duplicate confirmation prompt */}
      {duplicatePrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card max-w-md w-full p-5 animate-in zoom-in-95 duration-200 border-white/5 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground">Possible duplicate receipt</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6 font-medium">
              We found an existing receipt that looks the same. Please confirm before adding a new expense.
            </p>

            <div className="bg-secondary/10 border border-white/5 rounded-2xl p-4 mb-8">
              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black mb-3">Existing receipt</div>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">{duplicatePrompt.candidateReceipt.merchantName}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-wider">{duplicatePrompt.candidateReceipt.date}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-black text-foreground font-mono leading-none">
                    <span className="text-accent text-xs align-top mr-0.5">$</span>{Number(duplicatePrompt.candidateReceipt.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{duplicatePrompt.candidateReceipt.currency}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 text-[9px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-accent animate-pulse"></div>
                Match: {duplicatePrompt.matchType === 'imageHash' ? 'Fingerprint Collision' : 'Metadata Overlap'}
              </div>
            </div>

            <div className="flex w-full gap-4">
              <button
                onClick={() => handleDuplicateDecision('ignore')}
                className="flex-1 py-3 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-emerald-500/20 cursor-pointer"
                disabled={status.isProcessing}
              >
                Yes — Ignore
              </button>
              <button
                onClick={() => handleDuplicateDecision('save')}
                className="flex-1 py-3 px-4 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5 cursor-pointer"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-card max-w-sm w-full p-8 animate-in zoom-in-95 duration-300 shadow-2xl border-white/5" role="dialog" aria-modal="true">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5 text-red-500 border border-red-500/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">Bulk Purge</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm">
                You are about to permanently delete <span className="text-foreground font-black underline decoration-red-500/30 underline-offset-4">{selectedIds.length}</span> nodes. This operation is non-reversible.
              </p>
              <div className="flex w-full gap-4">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-400 font-bold rounded-xl transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 cursor-pointer"
                >
                  Execute Purge
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