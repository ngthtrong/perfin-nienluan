import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

// Compact stat tile: icon chip + label + value. tone: brand | income | expense | warning | neutral.
export default function StatCard({ label, value, icon, tone = 'neutral', style }) {
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
          borderWidth: 1,
          borderColor: c.border,
          padding: 16,
        },
        style,
      ]}
    >
      {icon && (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: toneMap.soft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <MaterialIcons name={icon} size={18} color={toneMap.fg} />
        </View>
      )}
      <Text style={{ ...theme.typo.caption, color: c.textMuted, marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '900', color: tone === 'neutral' ? c.text : toneMap.fg }}>
        {value}
      </Text>
    </View>
  );
}
