import React from 'react';
import { ShieldAlert, BookOpen, Crown, HelpCircle } from 'lucide-react';

export const MapLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 px-4 py-2.5 bg-[#0C1021]/80 backdrop-blur-xs border border-[#202947] rounded-xl text-xs font-mono text-slate-300 shadow-md">
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded-full bg-[#1F2538] border-2 border-slate-500 inline-block shadow-inner" />
        <span className="text-slate-400">Unexplored</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded-full bg-red-950/80 border-2 border-red-500 inline-block shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        <span className="text-red-400 font-medium">Struggling (&lt;40%)</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded-full bg-amber-950/80 border-2 border-amber-400 inline-block shadow-[0_0_8px_rgba(245,197,66,0.5)]" />
        <span className="text-amber-300 font-medium">Developing (40–74%)</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded-full bg-emerald-950/80 border-2 border-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
        <span className="text-emerald-300 font-medium">Mastered (≥75%)</span>
      </div>
    </div>
  );
};
