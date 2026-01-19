import React, { useState, useEffect, useMemo } from 'react';
import { UploadSection } from './components/UploadSection';
import { ReceiptList } from './components/ReceiptList';
import { StatsOverview } from './components/StatsOverview';
import { ManualEntryForm } from './components/ManualEntryForm';
import { ReceiptFilters, FilterCriteria } from './components/ReceiptFilters';
import { processAndSaveReceipt, saveManualReceiptToDB, fetchReceiptsFromDB, deleteReceiptFromDB } from './services/awsService';
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
    try {
      await deleteReceiptFromDB(id);
    } catch (e) {
      console.error("Deletion failed", e);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 rounded-lg p-1.5 shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800">SmartReceipt Cloud</span>
          </div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-widest">Mistral AI Integrated</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Expense Tracker</h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Everything is handled in the cloud. Upload a receipt and our backend AI will process it automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Add Receipt</h2>
                {!showManualForm && (
                  <button 
                    onClick={() => setShowManualForm(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded transition-colors"
                  >
                    Add Manually
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
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
             <StatsOverview receipts={receipts} />

             <div>
               <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-3">
                   <h2 className="text-lg font-semibold text-slate-800">History</h2>
                   <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                     {filteredReceipts.length} total
                   </span>
                 </div>
                 
                 {filteredReceipts.length > 0 && (
                   <button 
                    onClick={handleExportCSV}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                     </svg>
                     Export CSV
                   </button>
                 )}
               </div>
               
               <ReceiptFilters 
                filters={filters} 
                onFilterChange={setFilters} 
                onClear={handleClearFilters} 
               />

               <ReceiptList receipts={filteredReceipts} onDelete={handleDelete} />
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;