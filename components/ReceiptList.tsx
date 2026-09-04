import React, { useState, useMemo, useEffect } from 'react';
import { ReceiptData } from '../types';

interface ReceiptListProps {
  receipts: ReceiptData[];
  onDelete: (id: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

type SortField = 'merchantName' | 'date' | 'total';
type SortDirection = 'asc' | 'desc';

export const ReceiptList: React.FC<ReceiptListProps> = ({
  receipts,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  hasActiveFilters = false,
  onClearFilters,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Close image modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingImageUrl(null);
        setConfirmDeleteId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        className="text-center py-16 px-4 glass-card bg-white/50"
        data-testid="empty-state"
      >
        <div className="w-14 h-14 bg-lavender-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-lavender-100/80 shadow-sm">
          <svg className="w-7 h-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        {hasActiveFilters ? (
          <>
            <h3 className="text-slate-700 font-bold text-base">No matching receipts</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-1 text-sm">No expenses matched your filter criteria.</p>
            {onClearFilters && (
              <button
                onClick={onClearFilters}
                className="mt-3.5 px-4 py-1.5 bg-white text-primary border border-pink-200 rounded-xl text-xs font-semibold hover:bg-pink-50 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </>
        ) : (
          <>
            <h3 className="text-slate-700 font-bold text-base">No records yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-1 text-sm">Upload your first receipt to start tracking your expenses with AI precision.</p>
          </>
        )}
      </div>
    );
  }

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <svg className="w-3.5 h-3.5 ml-1 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>;
    return sortDirection === 'asc'
      ? <svg className="w-3.5 h-3.5 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"></path></svg>
      : <svg className="w-3.5 h-3.5 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>;
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-pink-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-white/40">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all receipts"
                  className="w-4 h-4 rounded border-pink-200 bg-white text-primary focus:ring-primary/30 focus:ring-offset-0 transition-all cursor-pointer accent-primary"
                  checked={receipts.length > 0 && selectedIds.length === receipts.length}
                  onChange={onToggleSelectAll}
                />
              </th>
              <th className="p-3 cursor-pointer hover:text-primary transition-colors group select-none" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Date
                  <SortIcon field="date" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-primary transition-colors group select-none" onClick={() => handleSort('merchantName')}>
                <div className="flex items-center gap-1">
                  Merchant
                  <SortIcon field="merchantName" />
                </div>
              </th>
              <th className="p-3 text-right cursor-pointer hover:text-primary transition-colors group select-none" onClick={() => handleSort('total')}>
                <div className="flex items-center justify-end gap-1">
                  Amount
                  <SortIcon field="total" />
                </div>
              </th>
              <th className="p-3 w-20 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-50/80">
            {sortedReceipts.map((receipt) => {
              const isExpanded = expandedId === receipt.id;
              const isSelected = selectedIds.includes(receipt.id);

              return (
                <React.Fragment key={receipt.id}>
                  <tr
                    data-testid="receipt-item"
                    data-receipt-id={receipt.id}
                    onClick={() => toggleExpand(receipt.id)}
                    className={`group hover:bg-blush/50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-primary/8' : ''
                    } ${isExpanded ? 'bg-pink-50/40' : ''}`}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select receipt from ${receipt.merchantName}`}
                        className="w-4 h-4 rounded border-pink-200 bg-white text-primary focus:ring-primary/30 focus:ring-offset-0 transition-all cursor-pointer accent-primary opacity-80 sm:opacity-0 sm:group-hover:opacity-100 data-[checked=true]:opacity-100"
                        data-checked={isSelected}
                        checked={isSelected}
                        onChange={() => onToggleSelect(receipt.id)}
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-xs font-mono font-medium text-slate-500" data-testid="receipt-date">{receipt.date}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        {receipt.imageUrl ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingImageUrl(receipt.imageUrl!);
                            }}
                            title="View receipt image"
                            aria-label="View receipt image"
                            className="w-6 h-6 rounded-lg bg-lavender-50 border border-lavender-200/60 flex items-center justify-center text-xs text-secondary hover:text-white hover:bg-primary transition-all flex-shrink-0 cursor-pointer shadow-2xs"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-100/60 flex items-center justify-center text-slate-400 flex-shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" data-testid="merchant-name">{receipt.merchantName}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0"></div>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span>{receipt.items?.length || 0} items</span>
                            <span>•</span>
                            <span className="font-mono">{receipt.currency}</span>
                            <span className="text-primary text-[10px] ml-1 font-medium underline underline-offset-2">
                              {isExpanded ? 'Hide items' : 'View items'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <span className="text-sm font-bold text-slate-800 font-mono" data-testid="receipt-total">
                        {receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1">{receipt.currency}</span>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggleExpand(receipt.id)}
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(receipt.id, e)}
                          className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg p-1.5 transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                          title="Delete Record"
                          aria-label="Delete Record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Itemized Line Items Drawer */}
                  {isExpanded && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={5} className="p-4 border-y border-pink-100/50">
                        <div className="bg-white/90 rounded-xl p-4 border border-pink-100/80 shadow-2xs space-y-3 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between border-b border-pink-50 pb-2">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Itemized Breakdown
                            </h4>
                            <span className="text-xs font-mono text-slate-500">
                              Receipt ID: {receipt.id}
                            </span>
                          </div>

                          {receipt.items && receipt.items.length > 0 ? (
                            <div className="space-y-1.5 max-h-56 overflow-y-auto">
                              {receipt.items.map((item, itemIdx) => (
                                <div
                                  key={itemIdx}
                                  className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50/80 border border-slate-100"
                                >
                                  <span className="font-medium text-slate-700">{item.description || 'Item'}</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {receipt.currency} {Number(item.price).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                              <div className="flex justify-between items-center pt-2 text-xs font-bold text-slate-800 px-2.5">
                                <span>Total Sum:</span>
                                <span className="font-mono text-primary text-sm">
                                  {receipt.currency} {receipt.total.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-1">
                              No individual line items recorded for this receipt.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border-rose-100 shadow-glass-lg" role="dialog" aria-modal="true">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1 text-center">Confirm Deletion</h3>
            <p className="text-xs text-slate-500 mb-6 text-center leading-relaxed">
              Are you sure you want to permanently remove this receipt? This action cannot be undone.
            </p>
            <div className="flex w-full gap-2.5">
              <button
                onClick={handleCancelDelete}
                className="flex-1 py-2.5 px-3 bg-white hover:bg-blush text-slate-600 text-xs font-semibold rounded-xl transition-colors border border-pink-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-3 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Image View Modal */}
      {viewingImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setViewingImageUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center bg-white/95 rounded-2xl p-4 shadow-2xl border border-pink-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center w-full mb-3 pb-2 border-b border-pink-100/60">
              <span className="text-xs font-bold text-slate-700">Receipt Photo View</span>
              <div className="flex items-center gap-2">
                <a
                  href={viewingImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Open Original
                </a>
                <button
                  onClick={() => setViewingImageUrl(null)}
                  aria-label="Close receipt image modal"
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="overflow-auto w-full flex items-center justify-center">
              <img
                src={viewingImageUrl}
                alt="Receipt Document"
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};