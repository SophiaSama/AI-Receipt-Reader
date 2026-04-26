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
        <h3 className="text-foreground font-bold text-lg">No records yet</h3>
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
    if (sortField !== field) return <svg className="w-4 h-4 ml-1.5 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>;
    return sortDirection === 'asc'
      ? <svg className="w-4 h-4 ml-1.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"></path></svg>
      : <svg className="w-4 h-4 ml-1.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>;
  };

  return (
    <>
      {/* Table Headers for Sorting */}
      <div className="hidden sm:flex items-center px-8 py-4 mb-6 text-[10px] font-mono font-black text-slate-500 uppercase tracking-[0.25em] bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
        <div className="flex items-center justify-center w-10 mr-6">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-white/10 bg-black/20 text-accent focus:ring-accent/50 focus:ring-offset-0 transition-all cursor-pointer"
            checked={receipts.length > 0 && selectedIds.length === receipts.length}
            onChange={onToggleSelectAll}
          />
        </div>
        <button
          onClick={() => handleSort('merchantName')}
          className={`flex items-center hover:text-accent transition-colors ${sortField === 'merchantName' ? 'text-foreground' : ''} flex-grow max-w-[300px]`}
        >
          Provider <SortIcon field="merchantName" />
        </button>
        <button
          onClick={() => handleSort('date')}
          className={`flex items-center hover:text-accent transition-colors ${sortField === 'date' ? 'text-foreground' : ''} w-36`}
        >
          Commit Date <SortIcon field="date" />
        </button>
        <button
          onClick={() => handleSort('total')}
          className={`flex items-center justify-end hover:text-accent transition-colors ${sortField === 'total' ? 'text-foreground' : ''} flex-grow text-right pr-4`}
        >
          Volume <SortIcon field="total" />
        </button>
      </div>

      <div className="space-y-6">
        {sortedReceipts.map((receipt) => (
          <div
            key={receipt.id}
            data-testid="receipt-item"
            data-receipt-id={receipt.id}
            className={`glass-card p-8 hover:bg-white/[0.04] transition-all duration-500 relative group border ${selectedIds.includes(receipt.id) ? 'border-accent/40 bg-accent/[0.03]' : 'border-white/5'} hover:border-white/10 flex gap-6`}
          >
            <div className="flex flex-col items-center justify-start pt-1.5 mr-2">
              <input
                type="checkbox"
                className="w-5 h-5 rounded-lg border-white/10 bg-black/20 text-accent focus:ring-accent/50 focus:ring-offset-0 transition-all cursor-pointer"
                checked={selectedIds.includes(receipt.id)}
                onChange={() => onToggleSelect(receipt.id)}
              />
            </div>
            <div className="flex-grow">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-6 flex-grow overflow-hidden">
                  <button
                    onClick={() => receipt.imageUrl && setViewingImageUrl(receipt.imageUrl)}
                    disabled={!receipt.imageUrl}
                    className={`w-16 h-16 rounded-2xl bg-black/40 overflow-hidden flex-shrink-0 border border-white/10 transition-all duration-700 ${receipt.imageUrl ? 'hover:scale-105 hover:border-accent/40 cursor-pointer shadow-[0_0_20px_rgba(0,0,0,0.5)]' : 'cursor-default opacity-30'}`}
                    title={receipt.imageUrl ? "View Source" : "No Source"}
                  >
                    {receipt.imageUrl ? (
                      <img src={receipt.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      </div>
                    )}
                  </button>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="font-bold text-foreground text-xl truncate pr-2 tracking-tight" data-testid="merchant-name">{receipt.merchantName || "Untitled Node"}</h3>
                      <span className="hidden sm:flex items-center gap-1.5 bg-accent/10 text-accent text-[9px] font-black uppercase px-2.5 py-1 rounded-md border border-accent/20 tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.1)]">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Verified
                      </span>
                    </div>
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">ID Hash: {receipt.id.split('-').pop()}</p>
                  </div>
                </div>

                <div className="hidden sm:block w-40 pt-2 text-center">
                  <p className="text-sm font-bold text-slate-400 font-mono tracking-tighter" data-testid="receipt-date">{receipt.date}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{receipt.currency}</span>
                    <p className="font-black text-foreground text-3xl font-mono leading-none tracking-tighter" data-testid="receipt-total">
                      <span className="text-accent/50 text-sm align-top mt-1 mr-0.5">$</span>{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items View */}
              <div className="mt-6 pt-6 border-t border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent -mx-8 px-8 relative">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Semantic Objects</span>
                  <div className="h-px flex-grow mx-4 bg-white/5"></div>
                  <span className="text-[10px] font-mono font-bold text-slate-500">×{receipt.items.length.toString().padStart(2, '0')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-3 mb-6">
                  {receipt.items.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-4 py-0.5 group/item">
                      <span className="text-[11px] font-semibold text-slate-500 truncate group-hover/item:text-slate-300 transition-colors uppercase tracking-tight">{item.description}</span>
                      <div className="flex-grow border-b border-white/[0.03] mx-2"></div>
                      <span className="text-[11px] font-bold text-slate-400 font-mono tracking-tighter bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/5">{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom Action Bar */}
                <div className="flex justify-between items-center mt-6">
                  <div>
                    {receipt.items.length > 4 && (
                      <button className="text-[9px] font-black text-accent hover:text-blue-400 uppercase tracking-[0.25em] transition-all py-1.5 flex items-center gap-2 group/more">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent group-hover/more:animate-ping"></span>
                        {receipt.items.length - 4} Additional Nodes Extracted
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {receipt.imageUrl && (
                      <button
                        onClick={() => setViewingImageUrl(receipt.imageUrl!)}
                        className="p-2.5 bg-white/[0.03] hover:bg-accent/10 text-slate-500 hover:text-accent rounded-xl border border-white/5 hover:border-accent/20 transition-all shadow-inner"
                        title="View Source"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClick(receipt.id)}
                      className="p-2.5 bg-white/[0.03] hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-xl border border-white/5 hover:border-red-500/20 transition-all shadow-inner"
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

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass-card max-w-sm w-full p-12 animate-in zoom-in-95 duration-300 shadow-[0_0_100px_rgba(0,0,0,0.8)] border-white/5" role="dialog" aria-modal="true">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-red-500/10 flex items-center justify-center mb-8 text-red-500 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Purge Object?</h3>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed text-sm">
                You are about to permanently decouple this node from the cluster. This action is terminal.
              </p>
              <div className="flex w-full gap-4">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 py-4 px-6 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all border border-white/5"
                >
                  Abort
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg shadow-red-500/20"
                >
                  Confirm Purge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-12 bg-black/80 backdrop-blur-3xl animate-in fade-in duration-700 cursor-zoom-out"
          onClick={() => setViewingImageUrl(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center p-4">
            <button
              className="absolute top-0 right-[-30px] p-4 text-white/20 hover:text-white transition-all z-10"
              onClick={() => setViewingImageUrl(null)}
            >
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="glass-card p-3 bg-white/[0.02] shadow-[0_0_150px_rgba(0,0,0,0.9)] overflow-hidden border-white/10">
              <img
                src={viewingImageUrl}
                alt="Source Document"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl animate-in zoom-in-95 duration-700"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};