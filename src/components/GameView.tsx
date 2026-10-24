import React, { useState } from 'react';
import { Question, Level, LevelResult, LieHunterRound, GameChoice } from '../types/course.ts';
import { ConceptRunnerGame } from './ConceptRunnerGame.tsx';
import { LieHunterGame } from './LieHunter/LieHunterGame.tsx';
import { QuizModeFallback } from './QuizModeFallback.tsx';
import { isAudioMuted, setAudioMuted } from '../services/soundEffects.ts';
import { AlertTriangle, RefreshCw, ArrowLeft, Gamepad2, FileQuestion } from 'lucide-react';

interface GameViewProps {
  gameType?: GameChoice;
  questions?: Question[];
  rounds?: LieHunterRound[];
  level: Level;
  practiceMode?: boolean;
  onFinish: (result: LevelResult) => void;
  onQuit: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  gameType = 'runner',
  questions = [],
  rounds = [],
  level,
  practiceMode = false,
  onFinish,
  onQuit,
}) => {
  const [useQuizMode, setUseQuizMode] = useState(false);
  const [hasGameError, setHasGameError] = useState(false);
  const [muted, setMuted] = useState(isAudioMuted());

  // Wrap onFinish to ensure Concept Runner answers are normalized with gameId: "runner"
  const handleFinish = (result: LevelResult) => {
    const normalizedResult: LevelResult = {
      ...result,
      gameId: result.gameId || gameType,
      answers: result.answers.map((a: any) => ({
        ...a,
        gameId: a.gameId || (gameType === 'lieHunter' ? 'lieHunter' : 'runner'),
      })),
    };
    onFinish(normalizedResult);
  };


  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
  };

  if (hasGameError) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-12 flex flex-col items-center">
        <div className="w-full bg-[#12162B] border-2 border-[#EF4444] rounded-xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500 text-red-400 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="font-pixel text-sm text-red-400 mb-2">The game could not load.</h2>
          <p className="text-xs sm:text-sm text-slate-300 mb-6">
            You can retry loading the runner, or switch to Quiz Mode to play through the questions directly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setHasGameError(false)}
              className="btn-pixel-gold px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-black" />
              <span>Try again</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setHasGameError(false);
                setUseQuizMode(true);
              }}
              className="btn-pixel-teal px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <FileQuestion className="w-4 h-4 text-black" />
              <span>Play in Quiz Mode</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lie Hunter Mode
  if (gameType === 'lieHunter') {
    return (
      <div className="w-full">
        <LieHunterGame
          rounds={rounds}
          level={level}
          practiceMode={practiceMode}
          muted={muted}
          onFinish={handleFinish}
          onQuit={onQuit}
        />
      </div>
    );
  }

  // Quiz Mode Fallback (for Runner)
  if (useQuizMode) {
    return (
      <div className="w-full">
        <div className="max-w-3xl mx-auto px-4 pt-2 flex justify-between items-center text-xs">
          <span className="text-slate-400">Card-based Quiz Mode</span>
          <button
            type="button"
            onClick={() => setUseQuizMode(false)}
            className="text-[#F5C542] hover:underline flex items-center gap-1 font-semibold"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Switch back to Runner</span>
          </button>
        </div>
        <QuizModeFallback
          questions={questions}
          level={level}
          practiceMode={practiceMode}
          muted={muted}
          onToggleMute={handleToggleMute}
          onFinish={handleFinish}
          onQuit={onQuit}
        />
      </div>
    );
  }

  // Concept Runner Mode
  return (
    <div className="w-full">
      <ConceptRunnerGame
        questions={questions}
        level={level}
        practiceMode={practiceMode}
        muted={muted}
        onFinish={handleFinish}
        onQuit={onQuit}
        onSwitchToQuizMode={() => setUseQuizMode(true)}
      />
    </div>
  );
};

