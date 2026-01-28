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
    <div className="glass-card p-6 mb-8 transition-all duration-300 border border-white/5">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Search Bar */}
        <div className="relative flex-grow group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl leading-5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm transition-all shadow-inner"
            placeholder="Search records by merchant..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl border transition-all duration-300 ${isExpanded || hasActiveFilters
                ? 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.08] hover:border-white/20'
              }`}
          >
            <svg className={`w-4 h-4 mr-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Advanced
            {hasActiveFilters && (
              <span className="ml-3 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(245,158,11,1)]"></span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="px-4 py-3 text-xs font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-0 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 py-6 border-t border-white/5 mt-6' : 'max-h-0 opacity-0'}`}>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Min Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
            <input
              type="number"
              className="w-full pl-7 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="0.00"
              value={filters.minAmount}
              onChange={(e) => handleChange('minAmount', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Max Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
            <input
              type="number"
              className="w-full pl-7 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="999..."
              value={filters.maxAmount}
              onChange={(e) => handleChange('maxAmount', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Genesis Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all color-scheme-dark"
            value={filters.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Terminal Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all color-scheme-dark"
            value={filters.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};