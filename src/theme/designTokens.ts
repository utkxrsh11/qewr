/**
 * StudyQuest Design Tokens (Phase 7)
 * Single source of truth for colors, typography, spacing, radii, elevations, and animations.
 * Used across React components and Canvas drawing routines.
 */

export const TOKENS = {
  colors: {
    bg: '#08090C', // Jet black
    bgDark: '#040507',
    surface: '#10131A',
    surfaceRaised: '#161A24',
    surfaceOverlay: '#1C2230',
    border: '#202636',
    borderSubtle: '#181E2B',
    borderBright: '#0284C7', // Cerulean blue border
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    textDim: '#64748B',
    // Cerulean Blue
    cerulean: '#0284C7',
    ceruleanDim: '#0369A1',
    ceruleanDark: '#075985',
    ceruleanBright: '#38BDF8',
    ceruleanBg: 'rgba(2, 132, 199, 0.14)',
    // Neon Rose
    neonRose: '#FF1376',
    neonRoseDim: '#E11D48',
    neonRoseDark: '#9F1239',
    neonRoseBright: '#FF4D9E',
    neonRoseBg: 'rgba(255, 19, 118, 0.14)',
    // Aliases mapped to new theme
    gold: '#FF1376', // Neon rose for streak/sparks
    goldDim: '#E11D48',
    goldDark: '#9F1239',
    goldBg: 'rgba(255, 19, 118, 0.12)',
    teal: '#0284C7', // Cerulean blue
    tealDim: '#0369A1',
    tealDark: '#075985',
    tealBg: 'rgba(2, 132, 199, 0.12)',
    purple: '#0EA5E9',
    purpleDim: '#0284C7',
    purpleBg: 'rgba(2, 132, 199, 0.12)',
    red: '#FF1376',
    redDim: '#E11D48',
    redDark: '#9F1239',
    redBg: 'rgba(255, 19, 118, 0.14)',
    green: '#10B981',
    greenDim: '#059669',
    greenDark: '#047857',
    greenBg: 'rgba(16, 185, 129, 0.14)',
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
