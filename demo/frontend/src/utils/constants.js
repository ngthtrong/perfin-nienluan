// ─── Compatibility bridge ────────────────────────────────────────────────────
// The design system now lives in src/theme/. This file keeps legacy
// COLORS/SHADOWS imports working while new code uses useTheme().
import { buildTheme, RADIUS, SPACING, CATEGORY_COLORS } from '../theme/tokens';

const light = buildTheme(false);
const lc = light.colors;

export const COLORS = {
  primary: lc.brand,
  primaryLight: lc.brandSoft,
  primaryDark: lc.brandStrong,

  income: lc.income,
  incomeLight: lc.incomeSoft,
  expense: lc.expense,
  expenseLight: lc.expenseSoft,
  warning: lc.warning,
  warningLight: lc.warningSoft,

  background: lc.bg,
  surface: lc.surface,
  surfaceElevated: lc.surfaceAlt,
  overlay: lc.overlay,

  text: lc.text,
  textSecondary: lc.textSecondary,
  muted: lc.textMuted,

  border: lc.border,
  borderLight: lc.surfaceAlt,

  chatUserBubble: lc.chatUserBubble,
  chatAiBubble: lc.chatAiBubble,
  chatSystemBg: lc.warningSoft,
  chatSystemText: lc.warning,

  success: lc.income,
  danger: lc.expense,
  info: lc.info,
};

export const SHADOWS = light.shadows;

export { RADIUS, SPACING, CATEGORY_COLORS };
