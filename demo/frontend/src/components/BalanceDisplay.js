import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatVND } from '../utils/formatters';

export default function BalanceDisplay({ amount, size = 20, showSign = false, style }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const value = Number(amount || 0);
  const color = value > 0 ? c.income : value < 0 ? c.expense : c.textMuted;
  return (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={[{ fontSize: size, fontWeight: '800', color }, style]}>
      {formatVND(value, showSign)}
    </Text>
  );
}
