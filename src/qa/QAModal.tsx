import React, { useState, useEffect } from 'react';
import { Modal } from '../components/common/Modal.tsx';
import { Button } from '../components/common/Button.tsx';
import { runQaTestSuite, QARunSummary } from './qaRunner.ts';
import { CheckCircle2, XCircle, RotateCcw, ShieldCheck } from 'lucide-react';

export interface QAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QAModal({ isOpen, onClose }: QAModalProps) {
  const [summary, setSummary] = useState<QARunSummary | null>(null);

  const executeSuite = () => {
    const res = runQaTestSuite();
    setSummary(res);
  };

  useEffect(() => {
    if (isOpen) {
      executeSuite();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SYSTEM QA SELF-CHECK SUITE" maxWidth="2xl">
      <div className="space-y-4 text-slate-200">
        <div className="flex items-center justify-between bg-[#0E1224] p-3 rounded-xl border border-[#232A47]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#2DD4BF]" />
            <div>
              <div className="font-pixel text-[11px] text-white">
                VERIFICATION STATUS:{' '}
                {summary?.failed === 0 ? (
                  <span className="text-[#22C55E]">ALL PASSED</span>
                ) : (
                  <span className="text-[#EF4444]">{summary?.failed} FAILED</span>
                )}
              </div>
              <div className="text-xs font-mono text-slate-400">
                {summary?.passed} of {summary?.total} tests passed ({summary?.durationMs} ms)
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={executeSuite}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Rerun Suite
          </Button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
          {summary?.results.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border text-xs font-mono flex items-start justify-between gap-3 ${
                r.passed
                  ? 'bg-[#12162B] border-[#22C55E]/30'
                  : 'bg-red-950/30 border-[#EF4444]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {r.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {r.suite}
                  </div>
                  <div className="text-slate-200 font-sans">{r.name}</div>
                  {r.error && (
                    <div className="text-red-300 text-[11px] mt-1 font-mono">{r.error}</div>
                  )}
                </div>
              </div>
              <span className="text-slate-500 shrink-0 text-[11px]">{r.durationMs}ms</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
