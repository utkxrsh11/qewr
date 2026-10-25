import React, { useState, useMemo } from 'react';
import { Course, Chapter, Concept, Level, StudyQuestProgress } from '../../types/course.ts';
import { useMastery, getChapterMastery, getConceptStats } from '../../services/masteryStore.ts';
import { isDue } from '../../services/masteryModel.ts';
import { DueBanner } from '../Revision/DueBanner.tsx';
import { JourneysNode, RealmConfig } from './JourneysNode.tsx';
import { JourneysSidebar } from './JourneysSidebar.tsx';
import { ConceptDetailModal } from './ConceptDetailModal.tsx';
import { buildLevels } from '../../services/levelBuilder.ts';
import { MapLegend } from './MapLegend.tsx';
import { X, Compass, ChevronLeft, MapPin, BarChart2, Sparkles } from 'lucide-react';

interface WorldMapViewProps {
  course: Course;
  progress?: StudyQuestProgress;
  onBackToCourse: () => void;
  onPracticeConcept: (concept: Concept, chapter: Chapter) => void;
  onSelectLevel?: (level: Level) => void;
  onOpenDashboard?: () => void;
  onStartSmartRevision?: () => void;
}

// 5 Iconic Realms matching the Journeys World Map reference design
const DEFAULT_REALMS: RealmConfig[] = [
  {
    id: 'bastion-of-storms',
    name: 'Bastion of Storms',
    teamTag: 'Vanguard',
    bannerImage: '/assets/journeys/banner_bastion.jpg',
    energyColor: '#A855F7',
    accentGradient: 'from-purple-500 to-indigo-500',
    coordX: 23,
    coordY: 26,
    defaultFloor: 84,
    chests: { bronze: 18, silver: 4, gold: 0 },
  },
  {
    id: 'frostbound-spire',
    name: 'Frostbound Spire',
    teamTag: 'Spitfire',
    bannerImage: '/assets/journeys/banner_frostbound.jpg',
    energyColor: '#38BDF8',
    accentGradient: 'from-sky-500 to-cyan-400',
    coordX: 62,
    coordY: 23,
    defaultFloor: 91,
    chests: { bronze: 25, silver: 2, gold: 0 },
  },
  {
    id: 'dark-forest',
    name: 'Dark Forest',
    teamTag: 'Gladiator',
    bannerImage: '/assets/journeys/banner_dark_forest.jpg',
    energyColor: '#10B981',
    accentGradient: 'from-emerald-500 to-teal-400',
    coordX: 44,
    coordY: 48,
    defaultFloor: 115,
    chests: { bronze: 70, silver: 10, gold: 0 },
  },
  {
    id: 'iron-mines',
    name: 'Iron Mines',
    teamTag: 'Colossus',
    bannerImage: '/assets/journeys/banner_iron_mines.jpg',
    energyColor: '#F97316',
    accentGradient: 'from-amber-500 to-orange-500',
    coordX: 22,
    coordY: 57,
    defaultFloor: 60,
    chests: { bronze: 12, silver: 1, gold: 0 },
  },
  {
    id: 'dunes',
    name: 'Dunes',
    teamTag: 'Main team',
    bannerImage: '/assets/journeys/banner_dunes.jpg',
    energyColor: '#F5C542',
    accentGradient: 'from-yellow-400 to-amber-500',
    coordX: 66,
    coordY: 57,
    defaultFloor: 117,
    chests: { bronze: 25, silver: 5, gold: 1 },
  },
];

export const WorldMapView: React.FC<WorldMapViewProps> = ({
  course,
  progress,
  onBackToCourse,
  onPracticeConcept,
  onSelectLevel,
  onOpenDashboard,
  onStartSmartRevision,
}) => {
  // Reactive subscription to mastery store
  useMastery();

  // Currently selected realm index (default to Frostbound Spire: index 1)
  const [selectedRealmIndex, setSelectedRealmIndex] = useState(1);
  const [selectedConceptInfo, setSelectedConceptInfo] = useState<{
    concept: Concept;
    chapter: Chapter;
  } | null>(null);

  // Compute playable levels dynamically
  const allLevels = useMemo(() => buildLevels(course), [course]);

  // Map user course chapters to realms
  const realmsWithChapters = useMemo(() => {
    return DEFAULT_REALMS.map((realm, index) => {
      const chapter = course.chapters[index % course.chapters.length];
      const chapterMastery = chapter ? getChapterMastery(chapter.id, course) : 0;
      return {
        realm,
        chapter,
        chapterMastery,
      };
    });
  }, [course]);

  const activeEntry = realmsWithChapters[selectedRealmIndex] || realmsWithChapters[0];

  // Handler for "Go to journey" action button
  const handleGoToJourney = () => {
    const chapter = activeEntry.chapter;
    if (!chapter) return;

    // Check if there is an uncompleted level in this chapter
    const chapterLevels = allLevels.filter((lvl) => lvl.chapterId === chapter.id);
    if (chapterLevels.length > 0 && onSelectLevel) {
      onSelectLevel(chapterLevels[0]);
    } else if (chapter.concepts.length > 0) {
      onPracticeConcept(chapter.concepts[0], chapter);
    }
  };

  const handleInspectConcept = (concept: Concept, chapter: Chapter) => {
    setSelectedConceptInfo({ concept, chapter });
  };

  // Calculate due count and played concepts
  const { dueCount, hasPlayedAnything } = useMemo(() => {
    let due = 0;
    let played = 0;
    const now = Date.now();
    course.chapters.forEach((ch) => {
      ch.concepts.forEach((c) => {
        const p = progress?.concepts[c.id];
        if (p && p.answered > 0) {
          played++;
          if (isDue(p, now)) due++;
        }
      });
    });
    return { dueCount: due, hasPlayedAnything: played > 0 };
  }, [course, progress]);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6 flex flex-col items-center">
      {/* Due for Review Banner per Phase 6 Section 3 */}
      <div className="w-full">
        <DueBanner
          dueCount={dueCount}
          hasPlayedAnything={hasPlayedAnything}
          onStartRevision={onStartSmartRevision || onOpenDashboard || (() => {})}
        />
      </div>

      {/* Outer RPG Journeys Modal Window */}
      <div
        className="w-full rounded-2xl sm:rounded-3xl border-2 border-[#1E273E] bg-[#080B13] shadow-[0_12px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col"
        style={{
          minHeight: '780px',
        }}
      >
        {/* 1. Window Header Bar matching reference screenshot */}
        <header className="relative flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#1A2338] bg-[#0A0D16] select-none z-30">
          {/* Top Left Course/Realm context */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToCourse}
              className="lg:hidden p-1.5 rounded-lg bg-[#141A29] text-slate-300 hover:text-white border border-[#2B354C] transition-colors cursor-pointer"
              aria-label="Back to course"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <Compass className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
              <span className="hidden sm:inline text-slate-400">Campaign ·</span>
              <span className="text-slate-200 font-semibold truncate max-w-[180px] sm:max-w-xs">
                {course.courseTitle}
              </span>
            </div>
          </div>

          {/* Top Center Title: "Journeys" & Secondary Smart Revision Button per Section 7 */}
          <div className="flex items-center gap-4">
            <h1 className="font-pixel text-base sm:text-lg text-white tracking-widest uppercase drop-shadow-md hidden sm:block">
              Journeys
            </h1>

            {onStartSmartRevision && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onStartSmartRevision}
                  className="btn-pixel-dark px-3 py-1.5 rounded-lg text-xs font-mono text-amber-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  aria-label="Start smart revision session"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F5C542]" />
                  <span>Smart revision</span>
                </button>
                <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
                  {dueCount} due for review
                </span>
              </div>
            )}
          </div>

          {/* Top Right Close Button "✕" */}
          <button
            type="button"
            onClick={onBackToCourse}
            className="w-8 h-8 rounded-lg bg-[#141A2B]/80 hover:bg-[#1E2840] border border-[#26324D] text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close Journeys and return to course"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 2. Main Body: Split into Interactive Illustrated Map Canvas (Left) & Inspector (Right) */}
        <div className="flex-1 flex flex-col lg:flex-row relative min-h-[640px] sm:min-h-[720px]">
          {/* LEFT: Interactive Map Canvas */}
          <div className="flex-1 relative overflow-hidden min-h-[500px] lg:min-h-full bg-[#05070D]">
            {/* Themed Topography Map Background */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out"
              style={{
                backgroundImage: 'url(/assets/journeys/world_map_terrain.jpg)',
                backgroundPosition: 'center 45%',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
              }}
            />

            {/* Subtle atmospheric vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 pointer-events-none" />

            {/* Connecting Trails / Winding Paths between Realms */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Path from Bastion of Storms (23,26) to Frostbound Spire (62,23) */}
              <path
                d="M 23% 26% Q 42% 16%, 62% 23%"
                fill="none"
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="2.5"
                strokeDasharray="4 6"
                strokeLinecap="round"
              />
              {/* Path from Bastion of Storms to Iron Mines (22,57) */}
              <path
                d="M 23% 26% Q 16% 42%, 22% 57%"
                fill="none"
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="2.5"
                strokeDasharray="4 6"
                strokeLinecap="round"
              />
              {/* Path from Frostbound Spire (62,23) to Dark Forest (44,48) */}
              <path
                d="M 62% 23% Q 54% 36%, 44% 48%"
                fill="none"
                stroke="rgba(56, 189, 248, 0.5)"
                strokeWidth="3"
                strokeDasharray="5 7"
                strokeLinecap="round"
              />
              {/* Path from Dark Forest (44,48) to Dunes (66,57) */}
              <path
                d="M 44% 48% Q 54% 54%, 66% 57%"
                fill="none"
                stroke="rgba(245, 197, 66, 0.5)"
                strokeWidth="3"
                strokeDasharray="5 7"
                strokeLinecap="round"
              />
              {/* Path from Iron Mines (22,57) to Dark Forest (44,48) */}
              <path
                d="M 22% 57% Q 32% 52%, 44% 48%"
                fill="none"
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="2.5"
                strokeDasharray="4 6"
                strokeLinecap="round"
              />
            </svg>

            {/* Interactive Realm Nodes on the Map */}
            {realmsWithChapters.map(({ realm, chapter, chapterMastery }, index) => (
              <JourneysNode
                key={realm.id}
                realm={realm}
                chapter={chapter}
                masteryPercent={chapterMastery}
                isSelected={selectedRealmIndex === index}
                onSelect={() => setSelectedRealmIndex(index)}
              />
            ))}

            {/* Map Legend Overlay Indicator in Bottom-Left */}
            <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-[#090D18]/90 border border-[#232F4C] backdrop-blur-md flex items-center gap-2 text-[10px] font-mono text-slate-300 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Tap a realm to inspect floor & concepts</span>
            </div>
          </div>

          {/* RIGHT: Journey Detail Inspector Sidebar */}
          <JourneysSidebar
            realm={activeEntry.realm}
            chapter={activeEntry.chapter}
            chapterMastery={activeEntry.chapterMastery}
            onGoToJourney={handleGoToJourney}
            onReturnHome={onBackToCourse}
            onInspectConcept={handleInspectConcept}
          />
        </div>
      </div>

      {/* Map Legend Overlay below window */}
      <div className="mt-4 w-full flex justify-center">
        <MapLegend />
      </div>

      {/* Concept Details Modal (When clicked from sidebar leaderboard) */}
      {selectedConceptInfo && (
        <ConceptDetailModal
          concept={selectedConceptInfo.concept}
          chapter={selectedConceptInfo.chapter}
          stats={getConceptStats(selectedConceptInfo.concept.id)}
          onClose={() => setSelectedConceptInfo(null)}
          onPractice={(concept, chapter) => {
            setSelectedConceptInfo(null);
            onPracticeConcept(concept, chapter);
          }}
        />
      )}
    </div>
  );
};
