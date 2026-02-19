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
        className="text-center py-16 glass-card bg-white/40"
        data-testid="empty-state"
      >
        <div className="w-14 h-14 bg-lavender-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-lavender-100">
          <svg className="w-7 h-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 className="text-slate-700 font-bold text-base">No records yet</h3>
        <p className="text-slate-400 max-w-xs mx-auto mt-1 text-sm">Upload your first receipt to start tracking your expenses with AI precision.</p>
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
            <tr className="border-b border-pink-100/60 text-[10px] font-semibold text-secondary uppercase tracking-wider">
              <th className="p-2.5 w-10">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-pink-200 bg-white text-primary focus:ring-primary/30 focus:ring-offset-0 transition-all cursor-pointer accent-primary"
                  checked={receipts.length > 0 && selectedIds.length === receipts.length}
                  onChange={onToggleSelectAll}
                />
              </th>
              <th className="p-2.5 cursor-pointer hover:text-primary transition-colors group" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Date
                  <SortIcon field="date" />
                </div>
              </th>
              <th className="p-2.5 cursor-pointer hover:text-primary transition-colors group" onClick={() => handleSort('merchantName')}>
                <div className="flex items-center gap-1">
                  Merchant
                  <SortIcon field="merchantName" />
                </div>
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-primary transition-colors group" onClick={() => handleSort('total')}>
                <div className="flex items-center justify-end gap-1">
                  Amount
                  <SortIcon field="total" />
                </div>
              </th>
              <th className="p-2.5 w-16 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-50">
            {sortedReceipts.map((receipt) => (
              <tr
                key={receipt.id}
                data-testid="receipt-item"
                data-receipt-id={receipt.id}
                className={`group hover:bg-blush/40 transition-colors ${selectedIds.includes(receipt.id) ? 'bg-primary/5' : ''}`}
              >
                <td className="p-2.5">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-pink-200 bg-white text-primary focus:ring-primary/30 focus:ring-offset-0 transition-all cursor-pointer accent-primary opacity-0 group-hover:opacity-100 data-[checked=true]:opacity-100"
                    data-checked={selectedIds.includes(receipt.id)}
                    checked={selectedIds.includes(receipt.id)}
                    onChange={() => onToggleSelect(receipt.id)}
                  />
                </td>
                <td className="p-2.5 whitespace-nowrap">
                  <span className="text-xs font-mono text-slate-400" data-testid="receipt-date">{receipt.date}</span>
                </td>
                <td className="p-2.5">
                  <div className="flex items-center gap-2.5">
                    {receipt.imageUrl ? (
                      <button
                        onClick={() => setViewingImageUrl(receipt.imageUrl!)}
                        className="w-5 h-5 rounded bg-lavender-50 flex items-center justify-center text-xs text-secondary hover:text-white hover:bg-primary transition-colors flex-shrink-0 cursor-pointer"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    ) : (
                      <div className="w-5 h-5"></div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]" data-testid="merchant-name">{receipt.merchantName}</span>
                        {/* AI Badge */}
                        <div className="w-1 h-1 rounded-full bg-primary/50"></div>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {receipt.items.length} items • {receipt.currency}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-2.5 text-right whitespace-nowrap">
                  <span className="text-sm font-semibold text-slate-700 font-mono" data-testid="receipt-total">
                    {receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="p-2.5 text-center">
                  <button
                    onClick={() => handleDeleteClick(receipt.id)}
                    className="text-slate-300 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-1 cursor-pointer"
                    title="Purge Record"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card max-w-sm w-full p-5 animate-in zoom-in-95 duration-200 border-pink-100 shadow-glass-lg" role="dialog" aria-modal="true">
            <h3 className="text-base font-semibold text-slate-800 mb-1.5">Confirm Deletion</h3>
            <p className="text-sm text-slate-500 mb-5">
              Are you sure you want to delete this record? This cannot be undone.
            </p>
            <div className="flex w-full gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 py-2 px-3 bg-white hover:bg-blush text-slate-500 text-sm font-medium rounded-lg transition-colors border border-pink-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-500 text-sm font-medium rounded-lg transition-colors border border-rose-200 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {viewingImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setViewingImageUrl(null)}
        >
          <img
            src={viewingImageUrl}
            alt="Receipt"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-glass-lg"
          />
        </div>
      )}
    </>
  );
};