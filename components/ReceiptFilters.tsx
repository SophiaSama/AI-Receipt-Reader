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

  const activeFilterCount = [
    Boolean(filters.search),
    Boolean(filters.startDate),
    Boolean(filters.endDate),
    Boolean(filters.minAmount),
    Boolean(filters.maxAmount),
  ].filter(Boolean).length;

  const handleApplyPreset = (preset: 'all' | 'this-month' | 'last-30') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      onFilterChange({ ...filters, startDate: '', endDate: '' });
    } else if (preset === 'this-month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      onFilterChange({ ...filters, startDate: firstDay, endDate: todayStr });
    } else if (preset === 'last-30') {
      const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      onFilterChange({ ...filters, startDate: past30, endDate: todayStr });
    }
  };

  return (
    <div className="space-y-2 mb-2">
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search by Merchant */}
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-9 py-2.5 bg-white/90 border border-pink-100 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            placeholder="Search by merchant name..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
          />
          {filters.search && (
            <button
              onClick={() => handleChange('search', '')}
              aria-label="Clear search input"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Toggle & Clear Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer shadow-sm ${
              isExpanded || activeFilterCount > 0
                ? 'bg-lavender-50 border-secondary/40 text-secondary'
                : 'bg-white/90 border-pink-100 text-slate-600 hover:bg-blush hover:text-primary hover:border-pink-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={onClear}
              className="px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-200 hover:bg-rose-50 rounded-xl cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Expandable Advanced Filter Drawer */}
      {isExpanded && (
        <div className="p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-pink-100 shadow-sm space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-50 pb-2.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Filter Settings</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] mr-1">Quick Dates:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('this-month')}
                className="px-2 py-0.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('last-30')}
                className="px-2 py-0.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
              >
                All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-slate-50/70 border border-pink-100 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                value={filters.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-slate-50/70 border border-pink-100 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                value={filters.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
              />
            </div>

            {/* Min Amount */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Min Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-6 pr-3 py-2 bg-slate-50/70 border border-pink-100 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                  value={filters.minAmount}
                  onChange={(e) => handleChange('minAmount', e.target.value)}
                />
              </div>
            </div>

            {/* Max Amount */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Max Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                  className="w-full pl-6 pr-3 py-2 bg-slate-50/70 border border-pink-100 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                  value={filters.maxAmount}
                  onChange={(e) => handleChange('maxAmount', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};