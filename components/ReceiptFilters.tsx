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
    <div className="flex flex-col sm:flex-row gap-3 mb-1">
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-4 py-2 bg-white/80 border border-pink-100 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
          placeholder="Filter by merchant..."
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        {/* Simple Date Filter */}
        <input
          type="date"
          className="px-3 py-2 bg-white/80 border border-pink-100 rounded-lg text-sm text-slate-500 focus:outline-none focus:text-slate-700 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all w-32 md:w-auto"
          value={filters.startDate}
          onChange={(e) => handleChange('startDate', e.target.value)}
          placeholder="From"
        />
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-primary transition-colors border border-transparent hover:border-pink-100 rounded-lg cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};