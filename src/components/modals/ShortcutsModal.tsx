import React from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Keyboard } from 'lucide-react';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const shortcutGroups = [
    {
      category: 'Global Navigation',
      items: [
        { keys: ['?'], desc: 'Open this keyboard shortcuts guide' },
        { keys: ['Esc'], desc: 'Close any active modal or drawer' },
        { keys: ['Ctrl', 'Shift', 'P'], desc: 'Toggle Presenter Mode toolbar' },
      ],
    },
    {
      category: 'Concept Runner (Trivia)',
      items: [
        { keys: ['1', '2', '3', '4'], desc: 'Select corresponding answer option' },
        { keys: ['Space'], desc: 'Continue to explanation or next card' },
      ],
    },
    {
      category: 'Lie Hunter (Critical Analysis)',
      items: [
        { keys: ['1', '2', '3'], desc: 'Select suspect testimony statement' },
        { keys: ['Space'], desc: 'Accuse selected statement as the false lie' },
      ],
    },
    {
      category: 'Process Platformer (Sequencing)',
      items: [
        { keys: ['A', 'D', '←', '→'], desc: 'Move character left or right' },
        { keys: ['W', 'Space', '↑'], desc: 'Jump onto platforms' },
        { keys: ['R'], desc: 'Restart current platform sequence' },
      ],
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="KEYBOARD SHORTCUTS" maxWidth="2xl">
      <div className="space-y-6 text-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Keyboard className="w-4 h-4 text-[#F5C542]" />
          <span>Master StudyQuest with lightning keyboard controls:</span>
        </div>

        <div className="space-y-4">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="space-y-2">
              <h4 className="font-pixel text-[11px] text-[#2DD4BF] tracking-wider uppercase">
                {group.category}
              </h4>
              <div className="bg-[#0E1224] border border-[#232A47] rounded-lg divide-y divide-[#1A203C]">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 text-xs font-mono"
                  >
                    <span className="text-slate-300 font-sans">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 rounded bg-[#1A203C] border border-[#2D365C] text-[#F5C542] text-[11px] font-bold shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
