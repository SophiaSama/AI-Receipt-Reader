import React from 'react';

export interface FilterCriteria {
    search: string;
    minAmount: string;
    maxAmount: string;
    startDate: string;
    endDate: string;
}

interface ReceiptFiltersProps {
    filters: FilterCriteria;
    onFilterChange: (filters: FilterCriteria) => void;
    onClear: () => void;
}

export const ReceiptFilters: React.FC<ReceiptFiltersProps> = ({ filters, onFilterChange, onClear }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    const handleChange = (field: keyof FilterCriteria, value: string) => {
        onFilterChange({ ...filters, [field]: value });
    };

    const hasActiveFilters = filters.search || filters.minAmount || filters.maxAmount || filters.startDate || filters.endDate;

    return (
        <div className="glass-card p-8 mb-10 transition-all duration-500 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent/10 transition-colors duration-700"></div>

            <div className="flex flex-col md:flex-row gap-6 relative z-10">
                {/* Search Bar */}
                <div className="relative flex-grow group/search">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-600 group-focus-within/search:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-14 pr-6 py-4 bg-secondary/10 border border-white/5 rounded-2xl leading-5 text-foreground placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 sm:text-sm transition-all shadow-inner font-medium"
                        placeholder="Search providers or entries..."
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex items-center px-8 py-4 text-[10px] font-black uppercase tracking-[0.15em] rounded-2xl border transition-all duration-500 ${isExpanded || hasActiveFilters
                            ? 'bg-accent/10 border-accent/30 text-accent shadow-[0_0_25px_rgba(37,99,235,0.15)]'
                            : 'bg-secondary/10 border-white/5 text-slate-500 hover:bg-accent/5 hover:border-accent/20 hover:text-accent'
                            }`}
                    >
                        <svg className={`w-4 h-4 mr-3 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-3 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_10px_rgba(37,99,235,1)]"></span>
                        )}
                    </button>

                    {hasActiveFilters && (
                        <button
                            onClick={onClear}
                            className="px-6 py-4 text-[10px] font-black text-slate-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center group/reset"
                        >
                            <svg className="w-3.5 h-3.5 mr-2 group-hover/reset:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Filters */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-0 overflow-hidden transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100 py-10 border-t border-white/5 mt-8' : 'max-h-0 opacity-0'}`}>
                <div>
                    <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3">Min Volume</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-mono font-bold text-xs">$</span>
                        <input
                            type="number"
                            className="w-full pl-9 pr-4 py-3 bg-secondary/10 border border-white/5 rounded-xl text-sm text-foreground focus:ring-2 focus:ring-accent/30 outline-none transition-all placeholder-slate-600 font-mono"
                            placeholder="0.00"
                            value={filters.minAmount}
                            onChange={(e) => handleChange('minAmount', e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3">Max Volume</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-mono font-bold text-xs">$</span>
                        <input
                            type="number"
                            className="w-full pl-9 pr-4 py-3 bg-secondary/10 border border-white/5 rounded-xl text-sm text-foreground focus:ring-2 focus:ring-accent/30 outline-none transition-all placeholder-slate-600 font-mono"
                            placeholder="99k+"
                            value={filters.maxAmount}
                            onChange={(e) => handleChange('maxAmount', e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3">Genesis Range</label>
                    <input
                        type="date"
                        className="w-full px-4 py-3 bg-secondary/10 border border-white/5 rounded-xl text-sm text-foreground focus:ring-2 focus:ring-accent/30 outline-none transition-all font-mono uppercase"
                        value={filters.startDate}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3">Terminal Range</label>
                    <input
                        type="date"
                        className="w-full px-4 py-3 bg-secondary/10 border border-white/5 rounded-xl text-sm text-foreground focus:ring-2 focus:ring-accent/30 outline-none transition-all font-mono uppercase"
                        value={filters.endDate}
                        onChange={(e) => handleChange('endDate', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};