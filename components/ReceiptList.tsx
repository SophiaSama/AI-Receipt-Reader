import React, { useState, useMemo } from 'react';
import { ReceiptData } from '../types';

interface ReceiptListProps {
  receipts: ReceiptData[];
  onDelete: (id: string) => void;
}

type SortField = 'merchantName' | 'date' | 'total';
type SortDirection = 'asc' | 'desc';

export const ReceiptList: React.FC<ReceiptListProps> = ({ receipts, onDelete }) => {
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
        className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100"
        data-testid="empty-state"
      >
        <p className="text-slate-400">No receipts found.</p>
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
    if (sortField !== field) return <svg className="w-3 h-3 ml-1 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>;
    return sortDirection === 'asc' 
      ? <svg className="w-3 h-3 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
      : <svg className="w-3 h-3 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>;
  };

  return (
    <>
      {/* Table Headers for Sorting */}
      <div className="hidden sm:flex px-4 py-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
        <button 
          onClick={() => handleSort('merchantName')}
          className={`flex items-center hover:text-blue-600 transition-colors ${sortField === 'merchantName' ? 'text-blue-600' : ''} flex-grow max-w-[260px] ml-14`}
        >
          Merchant <SortIcon field="merchantName" />
        </button>
        <button 
          onClick={() => handleSort('date')}
          className={`flex items-center hover:text-blue-600 transition-colors ${sortField === 'date' ? 'text-blue-600' : ''} w-32`}
        >
          Date <SortIcon field="date" />
        </button>
        <button 
          onClick={() => handleSort('total')}
          className={`flex items-center justify-end hover:text-blue-600 transition-colors ${sortField === 'total' ? 'text-blue-600' : ''} flex-grow text-right pr-4`}
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
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3 flex-grow overflow-hidden">
                <button 
                  onClick={() => receipt.imageUrl && setViewingImageUrl(receipt.imageUrl)}
                  disabled={!receipt.imageUrl}
                  className={`w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 transition-transform ${receipt.imageUrl ? 'hover:scale-105 cursor-zoom-in' : 'cursor-default'}`}
                  title={receipt.imageUrl ? "View full image" : "No image available"}
                >
                  {receipt.imageUrl ? (
                    <img src={receipt.imageUrl} alt="Receipt thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                  )}
                </button>
                <div className="flex-grow min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate pr-2">{receipt.merchantName || "Unknown Merchant"}</h3>
                  <p className="text-xs text-slate-500 sm:hidden">{receipt.date}</p>
                </div>
              </div>
              
              <div className="hidden sm:block w-32 pt-2">
                <p className="text-sm text-slate-600">{receipt.date}</p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-bold text-slate-900 text-lg">
                  {receipt.currency} {receipt.total.toFixed(2)}
                </p>
                <div className="flex justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {receipt.imageUrl && (
                    <button 
                      onClick={() => setViewingImageUrl(receipt.imageUrl!)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      View
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteClick(receipt.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium inline-flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
            
            {/* Items View */}
            <div className="mt-3 pt-3 border-t border-slate-50">
               <div className="text-xs text-slate-400 flex justify-between items-center mb-2">
                  <span>Items ({receipt.items.length})</span>
               </div>
               <ul className="space-y-1">
                 {receipt.items.slice(0, 3).map((item, idx) => (
                   <li key={idx} className="flex justify-between text-sm text-slate-600">
                     <span className="truncate pr-4">{item.description}</span>
                     <span className="flex-shrink-0 text-slate-400">{item.price.toFixed(2)}</span>
                   </li>
                 ))}
                 {receipt.items.length > 3 && (
                   <li className="text-xs text-blue-500 italic text-center pt-1">
                     + {receipt.items.length - 3} more items
                   </li>
                 )}
               </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Deletion</h3>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to delete this receipt? This action cannot be undone and the record will be removed from the database.
              </p>
              <div className="flex w-full space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-red-200"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300 cursor-zoom-out"
          onClick={() => setViewingImageUrl(null)}
        >
          <div className="relative max-w-4xl w-full h-full flex items-center justify-center p-4">
            <button 
              className="absolute top-0 right-0 m-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
              onClick={() => setViewingImageUrl(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <img 
              src={viewingImageUrl} 
              alt="Full receipt" 
              className="max-w-full max-h-full object-contain rounded shadow-2xl animate-in zoom-in-95 duration-300" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};