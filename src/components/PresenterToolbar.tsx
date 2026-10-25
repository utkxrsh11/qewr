import React, { useState, useEffect, useRef } from 'react';
import {
  Presentation,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  BarChart2,
  BookOpen,
  Trophy,
  Upload,
  RefreshCw,
} from 'lucide-react';

interface PresenterToolbarProps {
  currentView: string;
  onNavigate: (view: any) => void;
  onClose: () => void;
}

export function PresenterToolbar({
  currentView,
  onNavigate,
  onClose,
}: PresenterToolbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Auto-hide cursor when idle for 3s
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseMove = () => {
      document.body.classList.remove('hide-cursor');
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        document.body.classList.add('hide-cursor');
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      document.body.classList.remove('hide-cursor');
    };
  }, []);

  // Presenter Stopwatch
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleZoom = (delta: number) => {
    const next = Math.max(80, Math.min(150, zoomLevel + delta));
    setZoomLevel(next);
    (document.body.style as any).zoom = `${next}%`;
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    (document.body.style as any).zoom = '100%';
  };

  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 transition-all select-none print:hidden"
      role="region"
      aria-label="Presenter Mode Toolbar"
    >
      <div className="bg-[#0B0D19]/95 border-2 border-[#F5C542] rounded-xl shadow-2xl p-2.5 backdrop-blur-md text-slate-200 flex flex-col gap-2">
        {/* Top Header Row of Toolbar */}
        <div className="flex items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#F5C542]">
            <Presentation className="w-4 h-4 shrink-0" />
            <span className="font-pixel text-[10px] tracking-wider">PRESENTER MODE</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Stopwatch */}
            <div className="flex items-center gap-1.5 bg-[#12162B] px-2 py-0.5 rounded border border-[#232A47]">
              <span className="text-[#2DD4BF] font-bold">{formatTimer(elapsedSeconds)}</span>
              <button
                type="button"
                onClick={() => setElapsedSeconds(0)}
                className="text-slate-400 hover:text-white p-0.5"
                title="Reset Session Timer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#12162B] px-1.5 py-0.5 rounded border border-[#232A47]">
              <button
                type="button"
                onClick={() => handleZoom(-10)}
                className="text-slate-400 hover:text-white px-1 font-bold"
                title="Zoom Out (A-)"
              >
                A-
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="text-[10px] text-slate-300 px-1 font-mono hover:text-[#F5C542]"
                title="Reset Zoom (100%)"
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                onClick={() => handleZoom(10)}
                className="text-slate-400 hover:text-white px-1 font-bold"
                title="Zoom In (A+)"
              >
                A+
              </button>
            </div>

            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1A203C]"
              title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Close Presenter Mode */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-[#1A203C]"
              title="Exit Presenter Mode (Ctrl+Shift+P)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View Quick-Jump Pills (Expandable) */}
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-[#1E2542] overflow-x-auto text-[11px] font-mono">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider shrink-0 mr-1">
              Jump:
            </span>
            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className={`px-2 py-1 rounded cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                currentView === 'upload'
                  ? 'bg-[#F5C542] text-black font-bold'
                  : 'bg-[#141A33] text-slate-300 hover:bg-[#1D2545]'
              }`}
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => onNavigate('course')}
              className={`px-2 py-1 rounded cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                currentView === 'course'
                  ? 'bg-[#F5C542] text-black font-bold'
                  : 'bg-[#141A33] text-slate-300 hover:bg-[#1D2545]'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              Overview
            </button>
            <button
              type="button"
              onClick={() => onNavigate('world-map')}
              className={`px-2 py-1 rounded cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                currentView === 'world-map'
                  ? 'bg-[#2DD4BF] text-black font-bold'
                  : 'bg-[#141A33] text-slate-300 hover:bg-[#1D2545]'
              }`}
            >
              <Compass className="w-3 h-3" />
              Map
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className={`px-2 py-1 rounded cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                currentView === 'dashboard'
                  ? 'bg-[#F5C542] text-black font-bold'
                  : 'bg-[#141A33] text-slate-300 hover:bg-[#1D2545]'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('revision-brief')}
              className={`px-2 py-1 rounded cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                currentView === 'revision-brief'
                  ? 'bg-[#C084FC] text-black font-bold'
                  : 'bg-[#141A33] text-slate-300 hover:bg-[#1D2545]'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              Revision
            </button>
            <button
              type="button"
              onClick={() => onNavigate('learn-card')}
              className={`px-2 py-1 rounded cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                currentView === 'learn-card'
                  ? 'bg-[#F5C542] text-black font-bold'
                  : 'bg-[#141A33] text-slate-300 hover:bg-[#1D2545]'
              }`}
            >
              Learn Card
            </button>
            <button
              type="button"
              onClick={() => onNavigate('game')}
              className={`px-2 py-1 rounded cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                currentView === 'game'
                  ? 'bg-[#22C55E] text-black font-bold'
                  : 'bg-[#141A33] text-slate-300 hover:bg-[#1D2545]'
              }`}
            >
              <Play className="w-3 h-3" />
              Game
            </button>
            <button
              type="button"
              onClick={() => onNavigate('result')}
              className={`px-2 py-1 rounded cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                currentView === 'result'
                  ? 'bg-[#F5C542] text-black font-bold'
                  : 'bg-[#141A33] text-slate-300 hover:bg-[#1D2545]'
              }`}
            >
              <Trophy className="w-3 h-3" />
              Result
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
