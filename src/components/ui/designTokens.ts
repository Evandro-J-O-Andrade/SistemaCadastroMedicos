// Design tokens — Gestão Médica Alpha Enterprise
// Paleta semântica para dark/light, tipografia e espaçamento.

export const COLORS = {
  // Brand — Enterprise hospitalar (Navy / Azul / Teal)
  navy: '#101d32',
  primary: '#101d32',
  primaryHover: '#1b2f4d',
  accent: '#245a81',
  accentHover: '#2e6e9e',
  teal: '#0e8d85',
  tealHover: '#12a79d',

  // Semantic
  success: '#059669',
  successBg: '#ecfdf5',
  warning: '#d97706',
  warningBg: '#fffbeb',
  error: '#dc2626',
  errorBg: '#fef2f2',
  info: '#245a81',
  infoBg: '#eff6ff',

  // Neutral (light mode)
  bg: '#f4f7fa',
  surface: '#ffffff',
  border: '#e8eef3',
  text: '#101d32',
  textSecondary: '#3c4d63',
  textMuted: '#6b7c93',
  textOnDark: '#e8eef3',

  // Neutral (dark mode)
  bgDark: '#0b1220',
  surfaceDark: '#101d32',
  borderDark: '#223350',
  textDark: '#e8eef3',
  textSecondaryDark: '#b7c4d6',
  textMutedDark: '#8395ad',

  // Overlay
  overlay: 'rgba(16, 29, 50, 0.55)',
  dropdownBg: '#ffffff',
  dropdownBorder: '#e8eef3',
} as const;

export const TYPOGRAPHY = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    xxl: '1.5rem',
    xxxl: '2rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
} as const;

export const BORDER = {
  radius: '8px',
  radiusLg: '12px',
  radiusFull: '9999px',
  width: '1px',
} as const;

export const SHADOW = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
} as const;

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

// Helper para aplicar tema dark/light
export function getThemeColors(isDark: boolean) {
  return isDark
    ? {
        bg: COLORS.bgDark,
        surface: COLORS.surfaceDark,
        border: COLORS.borderDark,
        text: COLORS.textDark,
        textSecondary: COLORS.textSecondaryDark,
        textMuted: COLORS.textMutedDark,
        dropdownBg: COLORS.surfaceDark,
        dropdownBorder: COLORS.borderDark,
      }
    : {
        bg: COLORS.bg,
        surface: COLORS.surface,
        border: COLORS.border,
        text: COLORS.text,
        textSecondary: COLORS.textSecondary,
        textMuted: COLORS.textMuted,
        dropdownBg: COLORS.dropdownBg,
        dropdownBorder: COLORS.dropdownBorder,
      };
}

export const LAYOUT = {
  sidebarWidth: '260px',
  sidebarCollapsedWidth: '72px',
  headerHeight: '60px',
} as const;
