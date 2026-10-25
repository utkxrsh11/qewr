import React from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { BookOpen, Gamepad2, Brain, CheckCircle2 } from 'lucide-react';

export interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="HOW STUDYQUEST WORKS" maxWidth="2xl">
      <div className="space-y-6 text-slate-200">
        <p className="text-sm font-sans text-slate-300 leading-relaxed">
          StudyQuest converts dry study notes, slide decks, and textbooks into an interactive pixel-dungeon learning adventure with spaced repetition.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#1A203C] border border-[#2D365C] rounded-xl flex flex-col gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#F5C542]/15 border border-[#F5C542]/30 flex items-center justify-center text-[#F5C542]">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-pixel text-xs text-[#F5C542]">1. DECOMPOSE</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Gemini extracts key concepts, definitions, and page references, building a structured chapter progression.
            </p>
          </div>

          <div className="p-4 bg-[#1A203C] border border-[#2D365C] rounded-xl flex flex-col gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#2DD4BF]/15 border border-[#2DD4BF]/30 flex items-center justify-center text-[#2DD4BF]">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h3 className="font-pixel text-xs text-[#2DD4BF]">2. PLAY</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Tackle Concept Runner for fast recall, Lie Hunter for critical analysis, and Process Platformer for procedural sequencing.
            </p>
          </div>

          <div className="p-4 bg-[#1A203C] border border-[#2D365C] rounded-xl flex flex-col gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#C084FC]/15 border border-[#C084FC]/30 flex items-center justify-center text-[#C084FC]">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="font-pixel text-xs text-[#C084FC]">3. RETAIN</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Mastery decays over time. The Dashboard and Smart Revision surface overdue concepts so you peak on exam day.
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#0E1224] border border-[#232A47] rounded-lg text-xs font-mono text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-[#22C55E]">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-bold">Zero-Risk Offline Fallback:</span>
          </div>
          <p className="text-slate-400 font-sans">
            If internet drops or API rates limit, StudyQuest seamlessly switches to built-in procedural question generation without halting your session.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={onClose}>
            Got It!
          </Button>
        </div>
      </div>
    </Modal>
  );
}
