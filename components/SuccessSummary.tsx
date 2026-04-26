import React from 'react';
import { ReceiptData } from '../types';

interface SuccessSummaryProps {
    receipt: ReceiptData;
    onClose: () => void;
}

export const SuccessSummary: React.FC<SuccessSummaryProps> = ({ receipt, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass-card max-w-md w-full p-6 animate-in zoom-in-95 duration-300 shadow-glass-lg border-emerald-100">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 text-emerald-500 border border-emerald-100">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Receipt Logged</h2>
                    <p className="text-sm text-slate-500 mb-6">Successfully processed and saved entry</p>

                    <div className="w-full bg-slate-50/50 rounded-2xl p-5 mb-6 border border-slate-100">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Merchant</span>
                                <span className="text-sm font-bold text-slate-700">{receipt.merchantName}</span>
                            </div>
                            <div className="h-px bg-slate-200/50"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Date</span>
                                <span className="text-sm font-medium text-slate-600">{receipt.date}</span>
                            </div>
                            <div className="h-px bg-slate-200/50"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross Total</span>
                                <span className="text-lg font-mono font-bold text-primary">
                                    {receipt.currency} ${receipt.total.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {receipt.items && receipt.items.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-slate-200/50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Line Items</span>
                                    <span className="text-[10px] font-bold text-slate-400">{receipt.items.length} Count</span>
                                </div>
                                <div className="max-h-24 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {receipt.items.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-[11px]">
                                            <span className="text-slate-500 truncate mr-4">{item.description}</span>
                                            <span className="font-mono text-slate-700 font-semibold">{receipt.currency} ${item.price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {receipt.items.length > 3 && (
                                        <div className="text-[10px] text-slate-400 italic text-center pt-1">
                                            + {receipt.items.length - 3} more items
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full btn-primary h-11 text-sm font-bold tracking-wide"
                    >
                        Acknowledge & Close
                    </button>
                </div>
            </div>
        </div>
    );
};
