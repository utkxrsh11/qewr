import React from 'react';

/**
 * PixelTorch Component
 * Retro 8-bit style animated torch with flickering pixel flame and glowing embers.
 */
export const PixelTorch: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const scale = size === 'sm' ? 'scale-75' : size === 'lg' ? 'scale-125' : 'scale-100';

  return (
    <div className={`relative flex flex-col items-center justify-center p-4 ${scale} select-none`} aria-hidden="true">
      {/* Outer Glow */}
      <div className="absolute w-28 h-28 rounded-full bg-amber-500/15 blur-xl animate-pulse pointer-events-none" />

      {/* Flame Container with pixel flicker */}
      <div className="relative w-12 h-14 flex items-end justify-center mb-1">
        {/* Flame Layer 1 - Outer Red/Orange */}
        <div className="absolute bottom-0 w-8 h-10 bg-amber-600 rounded-t-sm animate-bounce opacity-90"
             style={{ animationDuration: '0.4s' }} />

        {/* Flame Layer 2 - Mid Gold */}
        <div className="absolute bottom-1 w-6 h-8 bg-[#F5C542] rounded-t-sm animate-pulse"
             style={{ animationDuration: '0.25s' }} />

        {/* Flame Layer 3 - Core Bright Yellow */}
        <div className="absolute bottom-2 w-3 h-5 bg-yellow-100 rounded-t-sm" />

        {/* Floating pixel spark / ember */}
        <div className="absolute -top-1 left-2 w-1.5 h-1.5 bg-[#F5C542] animate-ping opacity-80"
             style={{ animationDuration: '1.2s' }} />
        <div className="absolute -top-3 right-2 w-1.5 h-1.5 bg-amber-400 animate-ping opacity-70"
             style={{ animationDuration: '1.6s', animationDelay: '0.5s' }} />
      </div>

      {/* Torch Sconce & Bracket (Pixel Art) */}
      <div className="flex flex-col items-center">
        {/* Metal Sconce Ring */}
        <div className="w-9 h-3 bg-[#4A5568] border-2 border-[#1A202C] rounded-sm shadow-inner flex justify-around items-center px-1">
          <div className="w-1 h-1 bg-[#CBD5E0]" />
          <div className="w-1 h-1 bg-[#CBD5E0]" />
        </div>
        {/* Wooden Handle */}
        <div className="w-4 h-9 bg-[#78350F] border-x-2 border-[#451A03] flex flex-col justify-between py-1">
          <div className="w-full h-1 bg-[#92400E]" />
          <div className="w-full h-1 bg-[#92400E]" />
        </div>
        {/* Bottom Pommel */}
        <div className="w-5 h-2 bg-[#4A5568] border border-[#1A202C] rounded-b-sm" />
      </div>
    </div>
  );
};
