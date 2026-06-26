// ─── Design System ─────────────────────────────────────────────────────────
// Inspired by modern fintech apps: Wise, Revolut, Monzo
// Palette: Deep Indigo + Warm Tones + Clean Surfaces

export const COLORS = {
  // Brand
  primary: '#5B5FEF',        // Vibrant indigo-purple
  primaryLight: '#EEEDFF',   // Soft tint for backgrounds
  primaryDark: '#3F3FCC',    // Pressed state

  // Semantic
  income: '#10B981',         // Emerald green
  incomeLight: '#D1FAE5',
  expense: '#F43F5E',        // Rose red
  expenseLight: '#FFE4E9',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',

  // Backgrounds
  background: '#F4F5FB',     // Slightly cool off-white
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFF', // Cards on surface
  overlay: 'rgba(15, 15, 35, 0.5)',

  // Text
  text: '#0F0F23',           // Near-black with blue tint
  textSecondary: '#4B4B6B',
  muted: '#9B9BB4',

  // Borders
  border: '#E8E8F0',
  borderLight: '#F0F0F8',

  // Chat
  chatUserBubble: '#5B5FEF',
  chatAiBubble: '#FFFFFF',
  chatSystemBg: '#FFF8E7',
  chatSystemText: '#92400E',

  // Gradients (used as arrays)
  gradientPrimary: ['#6366F1', '#4F46E5'],
  gradientBalance: ['#4F46E5', '#7C3AED'],
  gradientIncome: ['#10B981', '#059669'],
  gradientExpense: ['#F43F5E', '#E11D48'],

  // Status
  success: '#10B981',
  danger: '#F43F5E',
  info: '#06B6D4',
};

export const CATEGORY_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#F43F5E',
  '#06B6D4', '#8B5CF6', '#84CC16', '#EC4899',
];

export const SHADOWS = {
  sm: {
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
