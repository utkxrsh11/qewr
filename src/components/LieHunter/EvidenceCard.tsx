import React from 'react';
import { Statement } from '../../types/course.ts';

export interface EvidenceCardProps {
  statement: Statement;
  index: number; // 0, 1, 2, 3 -> Badge 1, 2, 3, 4
  isSelected: boolean;
  stampState?: 'none' | 'true' | 'false' | 'verified';
  isLocked: boolean;
  reduceMotion?: boolean;
  onSelect: (index: number) => void;
  onConfirm: () => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  statement,
  index,
  isSelected,
  stampState = 'none',
  isLocked,
  reduceMotion = false,
  onSelect,
  onConfirm,
}) => {
  const badgeNumber = index + 1;

  // Stable slight rotation angle per card index (-1.2deg, 0.8deg, -0.6deg, 1.1deg)
  const rotationAngles = [-1.1, 0.9, -0.7, 1.2];
  const rotation = reduceMotion ? 0 : rotationAngles[index % rotationAngles.length];

  // Handle double click/tap to instantly confirm accusation
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLocked) return;
    onSelect(index);
    onConfirm();
  };

  const handleClick = () => {
    if (isLocked) return;
    onSelect(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isLocked) return;
      if (isSelected) {
        onConfirm();
      } else {
        onSelect(index);
      }
    }
  };

  // Stamp styling and accessible status
  const getStampContent = () => {
    switch (stampState) {
      case 'false':
        return {
          text: 'FALSE',
          classes:
            'border-4 border-[#B91C1C] text-[#B91C1C] bg-red-100/90 shadow-lg font-black tracking-widest',
          subtext: 'Tampered Statement',
          announcement: `Statement ${badgeNumber} marked false.`,
        };
      case 'true':
        return {
          text: 'TRUE',
          classes:
            'border-4 border-[#15803D] text-[#15803D] bg-emerald-100/90 shadow-lg font-black tracking-widest',
          subtext: 'Authentic Fact',
          announcement: `Statement ${badgeNumber} marked true.`,
        };
      case 'verified':
        return {
          text: 'VERIFIED',
          classes:
            'border-4 border-[#0D9488] text-[#0F766E] bg-teal-100/90 shadow-lg font-black tracking-wider',
          subtext: 'Cleared by Magnifier',
          announcement: `Statement ${badgeNumber} verified true.`,
        };
      default:
        return null;
    }
  };

  const stampInfo = getStampContent();

  return (
    <button
      type="button"
      role="button"
      disabled={isLocked && stampState !== 'none'}
      aria-pressed={isSelected}
      aria-label={`Statement ${badgeNumber}: ${statement.text}${
        stampInfo ? ` (${stampInfo.announcement})` : ''
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      style={{
        transform: `rotate(${rotation}deg) ${isSelected && !reduceMotion ? 'translateY(-4px)' : ''}`,
        touchAction: 'manipulation',
      }}
      className={`relative w-full text-left p-4 sm:p-5 rounded-lg transition-all duration-150 cursor-pointer select-none group min-h-[140px] sm:min-h-[155px] flex flex-col justify-between ${
        // Evidence Parchment background styling
        'bg-[#F6E8CE] border-2 shadow-md'
      } ${
        isSelected
          ? 'border-[#F5C542] ring-4 ring-[#F5C542]/50 shadow-[0_10px_25px_rgba(245,197,66,0.35)] z-20'
          : 'border-[#8C7A58] hover:border-[#F5C542]/80 hover:shadow-lg'
      } ${
        isLocked
          ? 'opacity-85 cursor-not-allowed bg-[#EADAC0] border-[#9E8E72]'
          : 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C542]'
      }`}
    >
      {/* Top Evidence Pin */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#991B1B] border-2 border-[#FEF08A] shadow-md z-10 flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
      </div>

      {/* Subtle Desktop Magnifying Ring Hover Effect */}
      <div
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden md:block border border-[#D97706]/40 shadow-inner"
        aria-hidden="true"
      />

      {/* Card Header: Number Badge & Shortcut */}
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${
              isSelected
                ? 'bg-[#1E293B] text-[#F5C542] border-[#F5C542]'
                : 'bg-[#473B25] text-[#FDE68A] border-[#78633F]'
            }`}
          >
            {badgeNumber}
          </span>
          <span className="text-[11px] font-mono text-[#57482D] font-medium tracking-tight">
            Key [{badgeNumber}]
          </span>
        </div>

        {isSelected && !isLocked && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#92400E] bg-[#FDE68A] px-2 py-0.5 rounded border border-[#D97706]/40">
            Selected
          </span>
        )}
      </div>

      {/* Statement Text: Readable body font, at least 15px, never cut off */}
      <div className="flex-1 my-1">
        <p className="text-[#1A1814] font-medium text-[15px] sm:text-[16px] leading-relaxed">
          {statement.text}
        </p>
      </div>

      {/* Card Footer: Evidence Tag */}
      <div className="mt-2 pt-2 border-t border-[#DFD1B3] flex items-center justify-between text-[11px] font-mono text-[#6B5A3C]">
        <span>EVIDENCE #{badgeNumber}</span>
        {isLocked && stampState === 'verified' && (
          <span className="text-teal-800 font-semibold">Exonerated</span>
        )}
      </div>

      {/* STAMP OVERLAY */}
      {stampInfo && (
        <div
          className={`absolute inset-0 flex items-center justify-center p-3 rounded-lg z-30 pointer-events-none ${
            reduceMotion ? 'animate-fade-in' : 'animate-stamp'
          }`}
          aria-hidden="true"
        >
          <div
            className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded transform -rotate-12 uppercase text-center ${stampInfo.classes}`}
          >
            <div className="text-xl sm:text-2xl tracking-widest">{stampInfo.text}</div>
            <div className="text-[9px] sm:text-[10px] tracking-normal font-sans opacity-90 font-bold mt-0.5">
              {stampInfo.subtext}
            </div>
          </div>
        </div>
      )}
    </button>
  );
};
