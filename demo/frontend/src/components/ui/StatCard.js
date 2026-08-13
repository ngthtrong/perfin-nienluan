// Vai trò: Hiển thị một metric gọn với nhãn và màu semantic dành cho giá trị.
// Luồng chính: ánh xạ tone sang token rồi render label/value theo layout thống nhất.

import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Compact, text-first metric. Tone is reserved for the value because the label
// already carries the financial meaning.
export default function StatCard({ label, value, tone = 'neutral', style }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const toneMap = {
    brand:   { fg: c.brand,   soft: c.brandSoft },
    income:  { fg: c.income,  soft: c.incomeSoft },
    expense: { fg: c.expense, soft: c.expenseSoft },
    warning: { fg: c.warning, soft: c.warningSoft },
    neutral: { fg: c.textSecondary, soft: c.surfaceAlt },
  }[tone];

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: c.surface,
          borderRadius: theme.radius.lg,
          paddingVertical: 12,
          paddingHorizontal: 14,
        },
        style,
      ]}
    >
      <Text numberOfLines={1} style={{ ...theme.typo.label, color: c.textMuted, marginBottom: 4 }}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.68}
        style={{ fontSize: 20, lineHeight: 28, fontWeight: '700', color: tone === 'neutral' ? c.text : toneMap.fg }}
      >
        {value}
      </Text>
    </View>
  );
}
