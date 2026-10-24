import React, { useState, useMemo } from 'react';
import { Chapter, Concept } from '../../types/course.ts';
import { RealmConfig } from './JourneysNode.tsx';
import { ConceptMasteryRecord, getConceptStats } from '../../services/masteryStore.ts';
import { X, Trophy, Swords, Sparkles, ChevronRight, Play } from 'lucide-react';

interface JourneysSidebarProps {
  realm: RealmConfig;
  chapter?: Chapter;
  chapterMastery: number;
  onGoToJourney: () => void;
  onReturnHome: () => void;
  onInspectConcept: (concept: Concept, chapter: Chapter) => void;
  onCloseSidebar?: () => void;
}

export const JourneysSidebar: React.FC<JourneysSidebarProps> = ({
  realm,
  chapter,
  chapterMastery,
  onGoToJourney,
  onReturnHome,
  onInspectConcept,
  onCloseSidebar,
}) => {
  const [activeTab, setActiveTab] = useState<'damage' | 'loot'>('damage');

  const concepts = useMemo(() => {
    return chapter?.concepts || [];
  }, [chapter]);

  // Aggregate stats across concepts in this chapter
  const aggregateStats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let totalAttempts = 0;

    concepts.forEach((concept) => {
      const stats = getConceptStats(concept.id);
      wins += stats.correctAnswers;
      losses += Math.max(0, stats.totalAttempts - stats.correctAnswers);
      totalAttempts += stats.totalAttempts;
    });

    const timeWinText = wins > 0 ? '18s' : 'N/A';
    const totalTimeText = totalAttempts > 0 ? `${Math.max(1, Math.round(totalAttempts * 0.4))}m ${totalAttempts * 8 % 60}s` : '1m 41s';

    return {
      wins,
      losses,
      timeWinText,
      totalTimeText,
      startFloor: realm.defaultFloor,
    };
  }, [concepts, realm.defaultFloor]);

  // Concept damage leaderboard data
  const conceptDamageList = useMemo(() => {
    if (concepts.length === 0) {
      // Mocked concepts if chapter is not loaded yet
      return [
        { id: '1', name: 'Hydrological Flux', damage: 5780, percent: 92, icon: '/assets/journeys/row_icon_1.png' },
        { id: '2', name: 'Thermal Evaporation', damage: 3605, percent: 68, icon: '/assets/journeys/row_icon_2.png' },
        { id: '3', name: 'Condensation Nuclei', damage: 3097, percent: 54, icon: '/assets/journeys/row_icon_3.png' },
      ];
    }

    return concepts.map((concept, idx) => {
      const stats = getConceptStats(concept.id);
      const baseDamage = 2800 + (idx === 0 ? 2980 : idx === 1 ? 805 : 297);
      const computedDamage = stats.isAttempted
        ? Math.max(1200, stats.mastery * 58 + stats.correctAnswers * 240)
        : baseDamage;
      const percent = stats.isAttempted ? Math.max(15, stats.mastery) : Math.max(25, 90 - idx * 18);
      const icon = `/assets/journeys/row_icon_${(idx % 3) + 1}.png`;

      return {
        concept,
        id: concept.id,
        name: concept.name,
        damage: computedDamage,
        percent,
        icon,
      };
    });
  }, [concepts]);

  return (
    <aside
      aria-label="Journey details and realm mastery"
      className="w-full lg:w-[380px] xl:w-[410px] bg-[#0C101A] border-t lg:border-t-0 lg:border-l border-[#1F273D] flex flex-col justify-between shadow-2xl relative z-30 select-none overflow-y-auto"
    >
      {/* 1. Realm Top Landscape Artwork Banner */}
      <div>
        <div className="relative h-44 sm:h-48 w-full overflow-hidden border-b border-[#222E4A]">
          <img
            src={realm.bannerImage}
            alt={realm.name}
            className="w-full h-full object-cover object-center filter brightness-95 contrast-105"
          />

          {/* Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C101A] via-transparent to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />

          {/* Close / Collapse button on mobile/drawer */}
          {onCloseSidebar && (
            <button
              type="button"
              onClick={onCloseSidebar}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Realm Title Overlaid at Bottom Left */}
          <div className="absolute bottom-3 left-4 right-4">
            <div className="text-[10px] uppercase font-mono tracking-widest text-sky-400 font-bold drop-shadow">
              ACTIVE REALM
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-pixel tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] truncate">
              {chapter ? chapter.title : realm.name}
            </h2>
          </div>
        </div>

        {/* 2. Stage / Floor Header */}
        <div className="py-2.5 px-4 text-center border-b border-[#1A2338] bg-[#0A0E18]">
          <div className="text-lg sm:text-xl font-bold text-white font-pixel tracking-wider drop-shadow-sm">
            Floor {chapterMastery > 0 ? realm.defaultFloor : realm.defaultFloor}
          </div>
        </div>

        {/* 3. Quick Stats 5-Column Grid */}
        <div className="px-3 py-3 border-b border-[#1A2338] bg-[#0D121F]">
          <div className="grid grid-cols-5 text-center gap-1 font-mono text-[11px] sm:text-xs">
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-tighter">Wins</div>
              <div className="font-bold text-emerald-400 mt-0.5">{aggregateStats.wins}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-tighter">Losses</div>
              <div className="font-bold text-slate-400 mt-0.5">{aggregateStats.losses}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-tighter">Time/Win</div>
              <div className="font-semibold text-slate-300 mt-0.5">{aggregateStats.timeWinText}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-tighter">Total time</div>
              <div className="font-semibold text-slate-300 mt-0.5">{aggregateStats.totalTimeText}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-tighter">Start floor</div>
              <div className="font-bold text-slate-200 mt-0.5">{aggregateStats.startFloor}</div>
            </div>
          </div>
        </div>

        {/* 4. Tab Navigation (Loot vs Damage Done) */}
        <div className="flex items-center justify-end gap-6 px-5 pt-3 pb-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('loot')}
            className={`transition-colors cursor-pointer ${
              activeTab === 'loot'
                ? 'text-white font-bold border-b-2 border-sky-400 pb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Loot
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('damage')}
            className={`transition-colors cursor-pointer ${
              activeTab === 'damage'
                ? 'text-white font-bold border-b-2 border-sky-400 pb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Damage done
          </button>
        </div>

        {/* 5. Tab Content */}
        <div className="p-4 space-y-3">
          {activeTab === 'damage' ? (
            /* Concept Mastery Leaderboard */
            <div className="space-y-2.5">
              {conceptDamageList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if ('concept' in item && item.concept && chapter) {
                      onInspectConcept(item.concept, chapter);
                    }
                  }}
                  className="group flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#151D2E] transition-all cursor-pointer"
                  title="Click to inspect and practice this concept"
                >
                  {/* Left avatar with metallic frame */}
                  <div className="w-8 h-8 rounded border border-[#2D3C5C] overflow-hidden flex-shrink-0 bg-[#090D18] shadow-sm">
                    <img
                      src={item.icon}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>

                  {/* Damage score number */}
                  <div className="w-14 text-right font-mono text-xs font-bold text-slate-200 group-hover:text-sky-300">
                    {item.damage.toLocaleString()}
                  </div>

                  {/* Horizontal glowing cyan bar */}
                  <div className="flex-1 min-w-0">
                    <div className="relative h-4 rounded-sm bg-[#101726] border border-[#1E293F] overflow-hidden shadow-inner">
                      <div
                        className="h-full rounded-sm bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-300 transition-all duration-700 ease-out"
                        style={{
                          width: `${item.percent}%`,
                          boxShadow: '0 0 8px rgba(56, 189, 248, 0.7)',
                        }}
                      />
                    </div>
                    {/* Concept name label below the bar */}
                    <div className="text-[10px] text-slate-400 truncate mt-0.5 font-sans group-hover:text-slate-200">
                      {item.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Loot Tab Rewards */
            <div className="p-3 rounded-lg bg-[#0E1424] border border-[#232F4C] space-y-3">
              <div className="text-xs font-mono text-slate-300 flex items-center justify-between">
                <span>Realm Rewards</span>
                <span className="text-[#F5C542] font-bold">Unlocked</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-[#090D18] border border-[#1A253D]">
                  <img
                    src="/assets/journeys/chest_bronze.png"
                    alt="Bronze"
                    className="w-6 h-5 mx-auto object-contain mb-1"
                  />
                  <div className="font-bold text-amber-300">x{realm.chests.bronze}</div>
                  <div className="text-[10px] text-slate-400">Bronze</div>
                </div>
                <div className="p-2 rounded bg-[#090D18] border border-[#1A253D]">
                  <img
                    src="/assets/journeys/chest_silver.png"
                    alt="Silver"
                    className="w-6 h-5 mx-auto object-contain mb-1"
                  />
                  <div className="font-bold text-sky-300">x{realm.chests.silver}</div>
                  <div className="text-[10px] text-slate-400">Silver</div>
                </div>
                <div className="p-2 rounded bg-[#090D18] border border-[#1A253D]">
                  <img
                    src="/assets/journeys/chest_gold.png"
                    alt="Gold"
                    className="w-6 h-5 mx-auto object-contain mb-1"
                  />
                  <div className="font-bold text-yellow-300">x{realm.chests.gold}</div>
                  <div className="text-[10px] text-slate-400">Royal</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Squad Deck Strip (e.g. Spitfire) */}
      <div className="px-4 pb-2">
        <div className="text-center mb-1 text-[11px] font-pixel text-slate-300 tracking-wider">
          {realm.teamTag}
        </div>
        <div className="p-1.5 rounded-lg bg-[#080C14] border border-[#1D273D] flex items-center justify-center gap-2">
          {['avatar_1.png', 'avatar_2.png', 'avatar_3.png', 'avatar_4.png', 'avatar_5.png'].map(
            (avatar, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded border border-[#2B3958] bg-[#0E1524] overflow-hidden flex items-center justify-center shadow-xs"
              >
                <img
                  src={`/assets/journeys/${avatar}`}
                  alt={`Squad unit ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* 7. Bottom Action Buttons: Go to journey & Return home */}
      <div className="p-4 pt-2 border-t border-[#1C253B] bg-[#080B13] flex items-center gap-3">
        {/* Go to journey (Primary Blue Beveled Button) */}
        <button
          type="button"
          onClick={onGoToJourney}
          className="flex-1 relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded cursor-pointer transition-transform active:scale-98"
          aria-label={`Go to journey for ${realm.name}`}
        >
          <img
            src="/assets/journeys/btn_go_journey.png"
            alt="Go to journey"
            className="w-full h-auto object-contain drop-shadow-[0_2px_8px_rgba(56,189,248,0.3)] group-hover:brightness-110 transition-all"
          />
        </button>

        {/* Return home (Dark Slate Beveled Button) */}
        <button
          type="button"
          onClick={onReturnHome}
          className="flex-1 relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded cursor-pointer transition-transform active:scale-98"
          aria-label="Return home to course overview"
        >
          <img
            src="/assets/journeys/btn_return_home.png"
            alt="Return home"
            className="w-full h-auto object-contain group-hover:brightness-110 transition-all"
          />
        </button>
      </div>
    </aside>
  );
};
