import React from 'react';
import { Search, X } from 'lucide-react';
import { ConceptType } from '../types/course.ts';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: ConceptType | 'all';
  onTypeChange: (type: ConceptType | 'all') => void;
  counts: {
    all: number;
    fact: number;
    process: number;
    detail: number;
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  counts,
}) => {
  const filterOptions: Array<{ id: ConceptType | 'all'; label: string; count: number; activeColor: string }> = [
    { id: 'all', label: 'All', count: counts.all, activeColor: 'bg-[#F5C542] text-black border-[#D9A422]' },
    { id: 'fact', label: 'Fact', count: counts.fact, activeColor: 'bg-[#2DD4BF] text-slate-950 border-[#14B8A6]' },
    { id: 'process', label: 'Process', count: counts.process, activeColor: 'bg-[#F5C542] text-slate-950 border-[#D9A422]' },
    { id: 'detail', label: 'Detail', count: counts.detail, activeColor: 'bg-[#C084FC] text-slate-950 border-[#A855F7]' },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-[#111528] border-2 border-[#1E2542] mb-6">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <label htmlFor="concept-search" className="sr-only">
          Search concepts by name or summary
        </label>
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="concept-search"
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search concepts or explanations..."
          className="w-full pl-10 pr-9 py-2 rounded bg-[#0A0D1A] border border-[#252E52] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] transition-colors"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-[#F5C542]"
            aria-label="Clear search query"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Type Filter Chips (interactive buttons) */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" role="group" aria-label="Filter concepts by category">
        {filterOptions.map((opt) => {
          const isActive = selectedType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onTypeChange(opt.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542] ${
                isActive
                  ? `${opt.activeColor} shadow-md`
                  : 'bg-[#181E38] text-slate-300 border-[#2A345B] hover:bg-[#20284A] hover:text-white'
              }`}
              aria-pressed={isActive}
            >
              <span>{opt.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-black/20 text-current' : 'bg-[#0F1324] text-slate-400'
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
