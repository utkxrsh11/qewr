import React, { useState } from 'react';
import {
  Level,
  LevelResult,
  LevelSegment,
  Question,
  LieHunterRound,
  PlatformerRound,
  GameChoice,
} from '../types/course.ts';
import { GAME_REGISTRY } from '../services/gameRegistry.ts';
import { ChallengeIntroCard } from './ChallengeIntroCard.tsx';
import { mergeSegmentResults } from '../services/levelSession.ts';
import { QuizModeFallback } from './QuizModeFallback.tsx';
import { isAudioMuted } from '../services/soundEffects.ts';

interface GameViewProps {
  level: Level;
  segments?: LevelSegment[];
  segmentContents?: Record<string, any>;
  gameType?: GameChoice;
  questions?: Question[];
  rounds?: LieHunterRound[];
  platformerRounds?: PlatformerRound[];
  practiceMode?: boolean;
  onFinish: (result: LevelResult) => void;
  onQuit: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  level,
  segments,
  segmentContents = {},
  gameType = 'runner',
  questions = [],
  rounds = [],
  platformerRounds = [],
  practiceMode = false,
  onFinish,
  onQuit,
}) => {
  // If segments provided, run the multi-segment level session
  const isMultiSegment = Array.isArray(segments) && segments.length > 0;

  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [showingIntroCard, setShowingIntroCard] = useState(true);
  const [livesLeft, setLivesLeft] = useState(3);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [accumulatedResults, setAccumulatedResults] = useState<LevelResult[]>([]);
  const [useQuizMode, setUseQuizMode] = useState(false);

  // Single-game fallback (e.g. focused practice session from World Map)
  if (!isMultiSegment) {
    const game = GAME_REGISTRY[gameType] || GAME_REGISTRY.runner;
    const GameComponent = game.Component;

    const content =
      gameType === 'lieHunter'
        ? rounds
        : gameType === 'platformer'
        ? platformerRounds
        : questions;

    if (useQuizMode && gameType === 'runner') {
      return (
        <div className="w-full">
          <QuizModeFallback
            questions={questions}
            level={level}
            practiceMode={practiceMode}
            muted={isAudioMuted()}
            onToggleMute={() => {}}
            onFinish={onFinish}
            onQuit={onQuit}
          />
        </div>
      );
    }

    const props: any = {
      level,
      practiceMode,
      muted: isAudioMuted(),
      onFinish,
      onQuit,
      onSwitchToQuizMode: () => setUseQuizMode(true),
    };
    props[game.contentProp] = content;

    return (
      <div className="w-full">
        <GameComponent {...props} />
      </div>
    );
  }

  // --- MULTI-SEGMENT SESSION FLOW ---
  const activeSegment = segments[currentSegmentIdx];
  if (!activeSegment) return null;

  const game = GAME_REGISTRY[activeSegment.gameId];
  const GameComponent = game.Component;
  const content = segmentContents[activeSegment.id];

  const handleSegmentFinish = (segResult: LevelResult) => {
    const updatedResults = [...accumulatedResults, segResult];
    setAccumulatedResults(updatedResults);

    const nextLives = segResult.livesLeft;
    setLivesLeft(nextLives);

    // Compute endStreak
    let nextStreak = segResult.endStreak ?? 0;
    if (segResult.endStreak === undefined && Array.isArray(segResult.answers)) {
      // Trailing run of correct answers
      let streakCount = 0;
      for (let i = segResult.answers.length - 1; i >= 0; i--) {
        if (segResult.answers[i].correct) streakCount++;
        else break;
      }
      nextStreak = streakCount;
    }
    setCurrentStreak(nextStreak);

    const isOutOfLives =
      segResult.status === 'outOfLives' ||
      segResult.status === 'out_of_lives' ||
      (!practiceMode && nextLives <= 0);

    if (isOutOfLives) {
      // Entire level ends with status outOfLives
      const combined = mergeSegmentResults({
        level,
        practiceMode,
        segments,
        segmentResults: updatedResults,
        overallStatus: 'outOfLives',
      });
      onFinish(combined);
      return;
    }

    if (currentSegmentIdx < segments.length - 1) {
      // Proceed to next segment!
      setCurrentSegmentIdx((prev) => prev + 1);
      setShowingIntroCard(true);
    } else {
      // All segments completed!
      const combined = mergeSegmentResults({
        level,
        practiceMode,
        segments,
        segmentResults: updatedResults,
        overallStatus: 'completed',
      });
      onFinish(combined);
    }
  };

  // 1. Show Challenge Intro Card before each segment
  if (showingIntroCard) {
    return (
      <div className="w-full px-4">
        <ChallengeIntroCard
          segment={activeSegment}
          onStart={() => setShowingIntroCard(false)}
          onQuit={onQuit}
        />
      </div>
    );
  }

  // 2. Play Current Game Segment
  const segmentProps: any = {
    level: {
      ...level,
      concepts: activeSegment.concepts,
    },
    lives: livesLeft,
    initialStreak: currentStreak,
    practiceMode,
    muted: isAudioMuted(),
    onLivesChange: (l: number) => setLivesLeft(l),
    onFinish: handleSegmentFinish,
    onQuit,
  };
  segmentProps[game.contentProp] = content;

  return (
    <div className="w-full">
      <GameComponent {...segmentProps} />
    </div>
  );
};
