/**
 * StudyQuest Design Tokens (Phase 7)
 * Single source of truth for colors, typography, spacing, radii, elevations, and animations.
 * Used across React components and Canvas drawing routines.
 */

export const TOKENS = {
  colors: {
    bg: '#0B0D19',
    bgDark: '#070913',
    surface: '#12162B',
    surfaceRaised: '#1A203C',
    surfaceOverlay: '#20284D',
    border: '#232A47',
    borderSubtle: '#1A2038',
    borderBright: '#384370',
    text: '#E2E8F0',
    textMuted: '#94A3B8',
    textDim: '#64748B',
    gold: '#F5C542',
    goldDim: '#D9A422',
    goldDark: '#9E7410',
    goldBg: 'rgba(245, 197, 66, 0.12)',
    teal: '#2DD4BF',
    tealDim: '#14B8A6',
    tealDark: '#0F766E',
    tealBg: 'rgba(45, 212, 191, 0.12)',
    purple: '#C084FC',
    purpleDim: '#A855F7',
    purpleBg: 'rgba(192, 132, 252, 0.12)',
    red: '#EF4444',
    redDim: '#DC2626',
    redDark: '#991B1B',
    redBg: 'rgba(239, 68, 68, 0.14)',
    green: '#22C55E',
    greenDim: '#16A34A',
    greenDark: '#15803D',
    greenBg: 'rgba(34, 197, 94, 0.14)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  radii: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  typography: {
    pixelFont: "'Press Start 2P', monospace",
    bodyFont: "'Inter', system-ui, -apple-system, sans-serif",
    sizes: {
      title: '20px',
      heading: '16px',
      subheading: '14px',
      body: '15px',
      small: '13px',
      caption: '12px',
    },
  },
  elevation: {
    flat: '0 0 0 transparent',
    raised: '0 4px 12px rgba(5, 6, 10, 0.45)',
    overlay: '0 12px 32px rgba(0, 0, 0, 0.7)',
    goldGlow: '0 0 16px rgba(245, 197, 66, 0.25)',
    tealGlow: '0 0 16px rgba(45, 212, 191, 0.22)',
  },
  icons: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
} as const;

export type DesignTokens = typeof TOKENS;
