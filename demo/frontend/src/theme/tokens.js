// Vai trò: Định nghĩa design token dùng chung và dựng theme sáng/tối cho PERFIN.
// Luồng chính: gom màu, khoảng cách, bán kính và typography; màu semantic chỉ biểu đạt ý nghĩa tài chính.

const RADIUS = { xs: 8, sm: 12, md: 16, lg: 20, xl: 20, pill: 999 };

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Vùng chạm mở rộng cho nút chỉ có icon. Nút 32--38 px cộng thêm hitSlop này
// đạt ngưỡng chạm 44 px mà không phải nới rộng bố cục.
const HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

// Font scale — role → { size, weight, lineHeight }
const TYPO = {
  display: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  title:   { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  heading: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  subhead: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  body:    { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  label:   { fontSize: 12, fontWeight: '600', lineHeight: 16 },
};

const lightColors = {
  // Backgrounds
  bg: '#F6F8FB',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EFF3F8',
  overlay: 'rgba(15, 23, 42, 0.52)',

  // Text
  text: '#172033',
  textSecondary: '#526071',
  textMuted: '#6B7788',
  onBrand: '#FFFFFF',

  // Borders
  border: '#DCE3ED',
  borderStrong: '#C6D0DE',

  // Brand accent
  brand: '#1E40AF',
  brandSoft: '#E8EEFF',
  brandStrong: '#16358F',
  brandText: '#1E40AF',

  // Semantic
  income: '#16794C',
  incomeSoft: '#E7F5EE',
  expense: '#B4233B',
  expenseSoft: '#FBEAEC',
  warning: '#8A5A00',
  warningSoft: '#FFF4D8',
  info: '#1E40AF',
  infoSoft: '#E8EEFF',

  // Chat
  chatUserBubble: '#1E40AF',
  chatAiBubble: '#FFFFFF',
};

const darkColors = {
  // Backgrounds
  bg: '#0F1520',
  bgElevated: '#131B28',
  surface: '#171E2B',
  surfaceAlt: '#202A39',
  overlay: 'rgba(0, 0, 0, 0.6)',

  // Text
  text: '#F4F7FB',
  textSecondary: '#C4CDDA',
  textMuted: '#9AA7B8',
  onBrand: '#FFFFFF',

  // Borders
  border: '#2D3849',
  borderStrong: '#435067',

  // Brand accent (slightly lighter for dark bg)
  brand: '#315FC0',
  brandSoft: '#1B2B4D',
  brandStrong: '#5C83DB',
  brandText: '#9AB7FF',

  // Semantic
  income: '#5FC795',
  incomeSoft: '#163628',
  expense: '#F08A99',
  expenseSoft: '#3D2029',
  warning: '#E4B65E',
  warningSoft: '#3A2E18',
  info: '#9AB7FF',
  infoSoft: '#1B2B4D',

  // Chat
  chatUserBubble: '#315FC0',
  chatAiBubble: '#171E2B',
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
    sm: { shadowColor: '#10234D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
    md: { shadowColor: '#10234D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
    lg: { shadowColor: '#10234D', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 8 },
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

export { RADIUS, SPACING, TYPO, HIT_SLOP, lightColors, darkColors };
