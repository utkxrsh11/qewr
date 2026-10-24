import React from 'react';

interface DetectiveHelperProps {
  mood?: 'idle' | 'thinking' | 'celebrate' | 'concerned' | 'hint';
  speechText?: string;
  className?: string;
}

export const DetectiveHelper: React.FC<DetectiveHelperProps> = ({
  mood = 'idle',
  speechText = 'Hmm, something is off here...',
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {/* Code-drawn Pixel Detective Avatar */}
      <div className="relative w-11 h-11 sm:w-13 sm:h-13 shrink-0 rounded-lg bg-[#141A33] border-2 border-[#384574] p-1 shadow-lg flex items-center justify-center overflow-hidden">
        {/* Retro pixel trenchcoat + fedora detective sprite (SVG pixel art) */}
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Fedora hat brim */}
          <rect x="3" y="6" width="18" height="2" fill="#78350F" />
          {/* Fedora hat crown */}
          <rect x="6" y="2" width="12" height="4" fill="#92400E" />
          <rect x="6" y="5" width="12" height="1" fill="#451A03" />

          {/* Face */}
          <rect x="6" y="8" width="12" height="7" fill="#FDE047" />

          {/* Detective Glasses / Magnifier Monocle */}
          {mood === 'celebrate' ? (
            <>
              {/* Happy squint eyes */}
              <rect x="8" y="10" width="3" height="1" fill="#1E293B" />
              <rect x="13" y="10" width="3" height="1" fill="#1E293B" />
            </>
          ) : (
            <>
              {/* Dark observant detective glasses */}
              <rect x="7" y="10" width="4" height="2" fill="#0F172A" />
              <rect x="13" y="10" width="4" height="2" fill="#0F172A" />
              <rect x="11" y="10" width="2" height="1" fill="#0F172A" />
              {/* Monocle glint */}
              <rect x="8" y="10" width="1" height="1" fill="#38BDF8" />
            </>
          )}

          {/* Mustache / Mouth */}
          {mood === 'celebrate' ? (
            <rect x="10" y="13" width="4" height="1" fill="#9A3412" />
          ) : mood === 'concerned' ? (
            <rect x="10" y="13" width="4" height="1" fill="#1E293B" />
          ) : (
            <rect x="9" y="13" width="6" height="1" fill="#78350F" />
          )}

          {/* Trenchcoat collar */}
          <polygon points="4,15 12,22 8,24 4,24" fill="#B45309" />
          <polygon points="20,15 12,22 16,24 20,24" fill="#92400E" />
          {/* Collar tie */}
          <polygon points="11,16 13,16 12,21" fill="#DC2626" />
        </svg>

        {/* Mood spark / indicator */}
        {mood === 'celebrate' && (
          <span className="absolute -top-1 -right-1 text-xs animate-bounce">✨</span>
        )}
        {mood === 'hint' && (
          <span className="absolute -top-1 -right-1 text-xs animate-pulse">🔍</span>
        )}
      </div>

      {/* Speech Bubble: shows short varied reaction; collapses/hides gracefully on very narrow screens */}
      {speechText && (
        <div className="relative bg-[#1A213D] border border-[#3A4770] text-slate-200 text-[11px] sm:text-xs px-3 py-1.5 rounded-lg shadow-md max-w-[240px] sm:max-w-xs transition-all">
          <div className="absolute left-0 top-1/2 -translate-x-1.5 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-6 border-r-[#3A4770]" />
          <p className="line-clamp-2 leading-relaxed italic text-amber-200/90 font-medium">
            &ldquo;{speechText}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
};
