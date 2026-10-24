import React from 'react';
import { Chapter } from '../../types/course.ts';
import { Lock, Sparkles } from 'lucide-react';

export interface RealmConfig {
  id: string;
  name: string;
  teamTag: string;
  bannerImage: string;
  energyColor: string;
  accentGradient: string;
  coordX: number; // percentage across map width
  coordY: number; // percentage down map height
  defaultFloor: number;
  chests: {
    bronze: number;
    silver: number;
    gold: number;
  };
}

interface JourneysNodeProps {
  realm: RealmConfig;
  chapter?: Chapter;
  masteryPercent: number;
  isSelected: boolean;
  onSelect: () => void;
}

export const JourneysNode: React.FC<JourneysNodeProps> = ({
  realm,
  chapter,
  masteryPercent,
  isSelected,
  onSelect,
}) => {
  // SVG circular arc math for radius 30
  const radius = 29;
  const circumference = 2 * Math.PI * radius; // ~182.2
  // Visual arc percentage: if mastery is 0, give a tiny start sliver (e.g. 5%) or 0
  const arcPercent = Math.max(0, Math.min(100, masteryPercent > 0 ? masteryPercent : 15));
  const strokeDashoffset = circumference - (circumference * arcPercent) / 100;

  // Floor display: if user has mastery, calculate floor (e.g. 90 + mastery / 2 or defaultFloor)
  const floorNumber = masteryPercent > 0 ? realm.defaultFloor : realm.defaultFloor;

  // Chapter title override if course chapter is mapped
  const displayName = chapter ? chapter.title : realm.name;
  const displayTag = chapter ? realm.teamTag : realm.teamTag;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer select-none group z-20 transition-transform duration-200"
      style={{
        left: `${realm.coordX}%`,
        top: `${realm.coordY}%`,
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Select ${displayName}, Floor ${floorNumber}, Mastery ${masteryPercent}%`}
    >
      {/* 1. Main Circular Orb with Progress Arc */}
      <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center">
        {/* Pulsing selection aura */}
        {isSelected && (
          <div
            className="absolute -inset-2.5 rounded-full animate-pulse pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${realm.energyColor}66 0%, transparent 70%)`,
              filter: 'blur(4px)',
            }}
          />
        )}

        {/* SVG Progress Arc */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 68 68"
        >
          {/* Background track circle */}
          <circle
            cx="34"
            cy="34"
            r={radius}
            fill="none"
            stroke="#162033"
            strokeWidth="3.5"
            strokeOpacity="0.8"
          />

          {/* Active Glowing Progress Arc */}
          <circle
            cx="34"
            cy="34"
            r={radius}
            fill="none"
            stroke={realm.energyColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: isSelected
                ? `drop-shadow(0 0 7px ${realm.energyColor})`
                : `drop-shadow(0 0 4px ${realm.energyColor}aa)`,
              transition: 'stroke-dashoffset 0.8s ease-out',
            }}
          />
        </svg>

        {/* Inner Node Core */}
        <div
          className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex flex-col items-center justify-center text-center p-1 border-2 transition-all duration-300 shadow-xl ${
            isSelected
              ? 'border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]'
              : 'border-[#334155] group-hover:border-slate-300 group-hover:scale-102'
          }`}
          style={{
            background: isSelected
              ? `radial-gradient(circle at center, #1E293B 20%, #0B111F 100%)`
              : `radial-gradient(circle at center, #182235 30%, #0A0F1D 100%)`,
          }}
        >
          {masteryPercent > 0 || chapter ? (
            <>
              <span className="font-pixel text-[13px] sm:text-sm font-bold text-white leading-none tracking-tight">
                {floorNumber}
              </span>
              <span
                className="text-[9px] uppercase font-bold tracking-widest mt-0.5"
                style={{ color: realm.energyColor }}
              >
                Floor
              </span>
            </>
          ) : (
            <Lock className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* 2. Realm Name & Tag Capsule Badge */}
      <div
        className={`mt-1.5 px-3 py-1 rounded-lg border text-center transition-all duration-200 backdrop-blur-md shadow-lg ${
          isSelected
            ? 'bg-[#0E1526]/95 border-sky-400/80 shadow-[0_4px_16px_rgba(14,21,38,0.9)] scale-105'
            : 'bg-[#0B101D]/90 border-[#263554] group-hover:border-slate-400/60'
        }`}
        style={{
          minWidth: '95px',
          maxWidth: '140px',
        }}
      >
        <div className="font-bold text-white text-[11px] sm:text-xs truncate font-pixel tracking-wide leading-tight">
          {displayName}
        </div>
        <div className="text-[9px] sm:text-[10px] text-slate-400 font-sans tracking-tight truncate leading-tight mt-0.5">
          {displayTag}
        </div>
      </div>

      {/* 3. Loot Reward Chests with Multipliers (Bronze, Silver, Gold) */}
      <div className="mt-1 flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full bg-[#070B14]/85 border border-[#1E293B]/70 shadow-md">
        {/* Bronze Chest */}
        <div className="flex items-center gap-0.5">
          <img
            src="/assets/journeys/chest_bronze.png"
            alt="Bronze chest"
            className="w-4 h-3.5 object-contain"
          />
          <span className="text-[9px] font-mono font-bold text-amber-200/90">
            x{realm.chests.bronze}
          </span>
        </div>

        {/* Silver Chest */}
        {realm.chests.silver > 0 && (
          <div className="flex items-center gap-0.5">
            <img
              src="/assets/journeys/chest_silver.png"
              alt="Silver chest"
              className="w-4 h-3.5 object-contain"
            />
            <span className="text-[9px] font-mono font-bold text-sky-200/90">
              x{realm.chests.silver}
            </span>
          </div>
        )}

        {/* Gold Chest */}
        {realm.chests.gold > 0 && (
          <div className="flex items-center gap-0.5">
            <img
              src="/assets/journeys/chest_gold.png"
              alt="Gold chest"
              className="w-4.5 h-3.5 object-contain"
            />
            <span className="text-[9px] font-mono font-bold text-yellow-300">
              x{realm.chests.gold}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
