// ─── Design tokens ───────────────────────────────────────────────────────────
// Modern minimal fintech (Wise / Revolut / Cash App): clean surfaces, one accent,
// generous whitespace, bold type. Semantic tokens power both light & dark themes.

const RADIUS = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

// Font scale — role → { size, weight, lineHeight }
const TYPO = {
  display: { fontSize: 32, fontWeight: '800', lineHeight: 38 },
  title:   { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  heading: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  subhead: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  body:    { fontSize: 15, fontWeight: '500', lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  label:   { fontSize: 11, fontWeight: '700', lineHeight: 14 },
};

// Warm, restrained chart palette. Color differentiates data series without
// turning ordinary surfaces and notifications into decorative color blocks.
const CATEGORY_COLORS = [
  '#A84B32', '#C3744F', '#D39A56', '#8B7651',
  '#B35D62', '#7F675A', '#C88766', '#6E7A5C',
];

const lightColors = {
  // Backgrounds
  bg: '#F7F4F1',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F2EDE9',
  overlay: 'rgba(35, 27, 23, 0.48)',

  // Text
  text: '#261F1B',
  textSecondary: '#5E514A',
  textMuted: '#7B6F68',
  onBrand: '#FFFFFF',

  // Borders
  border: '#E7DED8',
  borderStrong: '#D5C8C0',

  // Brand accent
  brand: '#A84B32',
  brandSoft: '#FBECE6',
  brandStrong: '#833722',
  brandText: '#8E3E29',

  // Semantic
  income: '#287A55',
  incomeSoft: '#E3F1E9',
  expense: '#B33A4A',
  expenseSoft: '#F8E7E9',
  warning: '#936015',
  warningSoft: '#F7EFD9',
  info: '#8E5945',
  infoSoft: '#F5EAE5',

  // Chat
  chatUserBubble: '#A84B32',
  chatAiBubble: '#FFFFFF',
};

const darkColors = {
  // Backgrounds
  bg: '#151210',
  bgElevated: '#1C1815',
  surface: '#211C19',
  surfaceAlt: '#2B2521',
  overlay: 'rgba(0, 0, 0, 0.6)',

  // Text
  text: '#F5F0EC',
  textSecondary: '#C9BCB4',
  textMuted: '#A89990',
  onBrand: '#FFFFFF',

  // Borders
  border: '#3A312C',
  borderStrong: '#50433C',

  // Brand accent (slightly lighter for dark bg)
  brand: '#B85B3C',
  brandSoft: '#3A251E',
  brandStrong: '#D77B59',
  brandText: '#F0A080',

  // Semantic
  income: '#68C394',
  incomeSoft: '#193126',
  expense: '#F07C88',
  expenseSoft: '#391E24',
  warning: '#E0AE5B',
  warningSoft: '#352A18',
  info: '#D89A7E',
  infoSoft: '#34241E',

  // Chat
  chatUserBubble: '#B85B3C',
  chatAiBubble: '#211C19',
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
    sm: { shadowColor: '#3B2B25', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.045, shadowRadius: 6, elevation: 1 },
    md: { shadowColor: '#3B2B25', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3 },
    lg: { shadowColor: '#3B2B25', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 26, elevation: 7 },
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
