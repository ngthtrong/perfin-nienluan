// ─── Design tokens ───────────────────────────────────────────────────────────
// Modern minimal fintech (Wise / Revolut / Cash App): clean surfaces, one accent,
// generous whitespace, bold type. Semantic tokens power both light & dark themes.

const RADIUS = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

// Font scale — role → { size, weight, lineHeight }
const TYPO = {
  display: { fontSize: 34, fontWeight: '800', lineHeight: 40 },
  title:   { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  heading: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  subhead: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  body:    { fontSize: 15, fontWeight: '500', lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  label:   { fontSize: 11, fontWeight: '700', lineHeight: 14 },
};

// Category chart palette (shared, theme-independent)
const CATEGORY_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#F43F5E',
  '#06B6D4', '#8B5CF6', '#84CC16', '#EC4899',
];

const lightColors = {
  // Backgrounds
  bg: '#F6F7FB',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F2F9',
  overlay: 'rgba(15, 15, 35, 0.45)',

  // Text
  text: '#0F1024',
  textSecondary: '#4A4B66',
  textMuted: '#9A9BB4',
  onBrand: '#FFFFFF',

  // Borders
  border: '#E8E9F2',
  borderStrong: '#D5D7E6',

  // Brand accent
  brand: '#5B5FEF',
  brandSoft: '#EEEDFF',
  brandStrong: '#3F3FCC',
  brandText: '#5B5FEF',

  // Semantic
  income: '#0FA968',
  incomeSoft: '#DFF6EC',
  expense: '#F03E62',
  expenseSoft: '#FEE7EC',
  warning: '#E08A00',
  warningSoft: '#FEF3D6',
  info: '#0EA5C6',
  infoSoft: '#DEF4FA',

  // Chat
  chatUserBubble: '#5B5FEF',
  chatAiBubble: '#FFFFFF',
};

const darkColors = {
  // Backgrounds
  bg: '#0C0D16',
  bgElevated: '#15161F',
  surface: '#181926',
  surfaceAlt: '#20222F',
  overlay: 'rgba(0, 0, 0, 0.6)',

  // Text
  text: '#F3F3F8',
  textSecondary: '#B4B5C9',
  textMuted: '#71738C',
  onBrand: '#FFFFFF',

  // Borders
  border: '#282A38',
  borderStrong: '#363849',

  // Brand accent (slightly lighter for dark bg)
  brand: '#8A8DFF',
  brandSoft: '#23233A',
  brandStrong: '#A5A7FF',
  brandText: '#A5A7FF',

  // Semantic
  income: '#3FD69A',
  incomeSoft: '#12281F',
  expense: '#FF6B85',
  expenseSoft: '#2E1620',
  warning: '#F5B342',
  warningSoft: '#2C2312',
  info: '#4CC7E4',
  infoSoft: '#122730',

  // Chat
  chatUserBubble: '#5B5FEF',
  chatAiBubble: '#181926',
};

function makeShadows(dark) {
  if (dark) {
    // Dark mode: near-flat, rely on surface contrast instead of shadow
    return {
      sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 1 },
      md: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 3 },
      lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 6 },
    };
  }
  return {
    sm: { shadowColor: '#1A1B3A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    md: { shadowColor: '#1A1B3A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    lg: { shadowColor: '#1A1B3A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
  };
}

export function buildTheme(dark) {
  return {
    dark,
    colors: dark ? darkColors : lightColors,
    radius: RADIUS,
    spacing: SPACING,
    typo: TYPO,
    shadows: makeShadows(dark),
  };
}

export { RADIUS, SPACING, TYPO, CATEGORY_COLORS, lightColors, darkColors };
