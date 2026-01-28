import React, { useState, useMemo } from 'react';
import { ReceiptData } from '../types';

interface ReceiptListProps {
  receipts: ReceiptData[];
  onDelete: (id: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

type SortField = 'merchantName' | 'date' | 'total';
type SortDirection = 'asc' | 'desc';

export const ReceiptList: React.FC<ReceiptListProps> = ({
  receipts,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedReceipts = useMemo(() => {
    return [...receipts].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'total') {
        comparison = a.total - b.total;
      } else if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        comparison = a.merchantName.localeCompare(b.merchantName);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [receipts, sortField, sortDirection]);

  if (receipts.length === 0) {
    return (
      <div
        className="text-center py-20 glass-card bg-white/[0.02]"
        data-testid="empty-state"
      >
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 className="text-white font-bold text-lg">No records yet</h3>
        <p className="text-slate-500 max-w-xs mx-auto mt-2">Upload your first receipt to start tracking your expenses with AI precision.</p>
      </div>
    );
  }

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <svg className="w-4 h-4 ml-1.5 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>;
    return sortDirection === 'asc'
      ? <svg className="w-4 h-4 ml-1.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"></path></svg>
      : <svg className="w-4 h-4 ml-1.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>;
  };

  return (
    <>
      {/* Table Headers for Sorting */}
      <div className="hidden sm:flex items-center px-6 py-3 mb-4 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] bg-white/[0.03] rounded-xl border border-white/5">
        <div className="flex items-center justify-center w-10 mr-4">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50 focus:ring-offset-0 transition-all cursor-pointer"
            checked={receipts.length > 0 && selectedIds.length === receipts.length}
            onChange={onToggleSelectAll}
          />
        </div>
        <button
          onClick={() => handleSort('merchantName')}
          className={`flex items-center hover:text-white transition-colors ${sortField === 'merchantName' ? 'text-white' : ''} flex-grow max-w-[300px]`}
        >
          Merchant <SortIcon field="merchantName" />
        </button>
        <button
          onClick={() => handleSort('date')}
          className={`flex items-center hover:text-white transition-colors ${sortField === 'date' ? 'text-white' : ''} w-32`}
        >
          Date <SortIcon field="date" />
        </button>
        <button
          onClick={() => handleSort('total')}
          className={`flex items-center justify-end hover:text-white transition-colors ${sortField === 'total' ? 'text-white' : ''} flex-grow text-right pr-6`}
        >
          Amount <SortIcon field="total" />
        </button>
      </div>

      <div className="space-y-4">
        {sortedReceipts.map((receipt) => (
          <div
            key={receipt.id}
            data-testid="receipt-item"
            data-receipt-id={receipt.id}
            className={`glass-card p-6 hover:bg-white/[0.06] transition-all duration-300 relative group border ${selectedIds.includes(receipt.id) ? 'border-primary/40 bg-primary/[0.03]' : 'border-white/5'} hover:border-white/20 flex gap-4`}
          >
            <div className="flex flex-col items-center justify-start pt-1">
              <input
                type="checkbox"
                className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-primary focus:ring-primary/50 focus:ring-offset-0 transition-all cursor-pointer shadow-sm"
                checked={selectedIds.includes(receipt.id)}
                onChange={() => onToggleSelect(receipt.id)}
              />
            </div>
            <div className="flex-grow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-4 flex-grow overflow-hidden">
                  <button
                    onClick={() => receipt.imageUrl && setViewingImageUrl(receipt.imageUrl)}
                    disabled={!receipt.imageUrl}
                    className={`w-14 h-14 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10 transition-all duration-500 ${receipt.imageUrl ? 'hover:scale-105 hover:border-primary/50 cursor-pointer' : 'cursor-default grayscale opacity-50'}`}
                    title={receipt.imageUrl ? "View scan" : "No scan"}
                  >
                    {receipt.imageUrl ? (
                      <img src={receipt.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      </div>
                    )}
                  </button>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-lg truncate pr-2 tracking-tight">{receipt.merchantName || "Untitled"}</h3>
                      <span className="hidden sm:flex items-center gap-1 bg-primary/10 text-primary text-[9px] font-black uppercase px-2 py-0.5 rounded border border-primary/20 tracking-tighter shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                        AI Verified
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 sm:block">Ref: {receipt.id.split('-').pop()}</p>
                  </div>
                </div>

                <div className="hidden sm:block w-32 pt-2">
                  <p className="text-sm font-bold text-slate-400 font-mono tracking-tighter">{receipt.date}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{receipt.currency}</span>
                    <p className="font-extrabold text-white text-2xl font-mono leading-none tracking-tighter">
                      {receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items View */}
              <div className="mt-4 pt-4 border-t border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent -mx-6 px-6 relative">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Line Items Component</span>
                  <span className="text-[10px] font-bold text-slate-400">×{receipt.items.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2 mb-4">
                  {receipt.items.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-4 py-0.5 group/item">
                      <span className="text-xs font-medium text-slate-400 truncate group-hover/item:text-slate-200 transition-colors uppercase tracking-tight">{item.description}</span>
                      <div className="flex-grow border-b border-dotted border-white/10 mx-2"></div>
                      <span className="text-xs font-bold text-slate-500 font-mono tracking-tighter bg-white/5 px-1.5 py-0.5 rounded">{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom Action Bar */}
                <div className="flex justify-between items-center mt-4">
                  <div>
                    {receipt.items.length > 4 && (
                      <button className="text-[10px] font-black text-primary hover:text-secondary uppercase tracking-[0.2em] transition-colors py-1 cursor-default">
                        + {receipt.items.length - 4} Shadow Entries Classified
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {receipt.imageUrl && (
                      <button
                        onClick={() => setViewingImageUrl(receipt.imageUrl!)}
                        className="p-2 bg-white/5 hover:bg-primary/20 text-slate-400 hover:text-primary rounded-lg border border-white/5 transition-all"
                        title="View Scan"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClick(receipt.id)}
                      className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg border border-white/5 transition-all"
                      title="Purge Record"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass-card max-w-sm w-full p-10 animate-in zoom-in-95 duration-300 shadow-[0_0_100px_rgba(0,0,0,0.5)] border-white/10" role="dialog" aria-modal="true">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Confirm Deletion</h3>
              <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                You are about to permanently delete this entry record. This operation is non-reversible.
              </p>
              <div className="flex w-full gap-4">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {viewingImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-950/40 backdrop-blur-3xl animate-in fade-in duration-500 cursor-zoom-out"
          onClick={() => setViewingImageUrl(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center p-4">
            <button
              className="absolute top-0 right-[-20px] p-3 text-white/40 hover:text-white transition-colors z-10"
              onClick={() => setViewingImageUrl(null)}
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="glass-card p-2 bg-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden">
              <img
                src={viewingImageUrl}
                alt="Original Scan"
                className="max-w-full max-h-[85vh] object-contain rounded-xl animate-in zoom-in-95 duration-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};