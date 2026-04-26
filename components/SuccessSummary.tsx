import React from 'react';
import { ReceiptData } from '../types';

interface SuccessSummaryProps {
    receipt: ReceiptData;
    onClose: () => void;
}

export const SuccessSummary: React.FC<SuccessSummaryProps> = ({ receipt, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-card max-w-sm w-full p-8 animate-in zoom-in-95 duration-300 shadow-[0_0_50px_rgba(37,99,235,0.1)] border-white/5">
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 text-accent border border-accent/20 shadow-[0_0_20px_rgba(37,99,235,0.15)]">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">Intelligence Logged</h2>
                    <p className="text-xs text-slate-500 mb-8 font-medium">Data successfully extracted and synchronized.</p>

                    <div className="w-full bg-secondary/10 rounded-2xl p-6 mb-8 border border-white/5">
                        <div className="space-y-5">
                            <div className="flex justify-between items-center group">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Provider</span>
                                <span className="text-sm font-semibold text-foreground">{receipt.merchantName}</span>
                            </div>
                            <div className="h-px bg-white/5"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entry Date</span>
                                <span className="text-sm font-mono text-slate-500">{receipt.date}</span>
                            </div>
                            <div className="h-px bg-white/5"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Volume</span>
                                <span className="text-xl font-mono font-bold text-accent tracking-tighter">
                                    {receipt.currency} ${receipt.total.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {receipt.items && receipt.items.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-white/5">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Schema Objects</span>
                                    <span className="text-[10px] font-mono font-bold text-slate-500">{receipt.items.length} Units</span>
                                </div>
                                <div className="max-h-24 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                    {receipt.items.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-[11px] items-start">
                                            <span className="text-slate-400 truncate mr-4 max-w-[140px]">{item.description}</span>
                                            <span className="font-mono text-slate-300 font-semibold shrink-0">${item.price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {receipt.items.length > 3 && (
                                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center pt-2">
                                            + {receipt.items.length - 3} additional nodes
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full btn-primary h-12 text-sm font-black uppercase tracking-widest"
                    >
                        Commit Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
