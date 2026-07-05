import { Text } from 'react-native';
import { COLORS } from '../utils/constants';
import { formatVND } from '../utils/formatters';

export default function BalanceDisplay({ amount, size = 20, showSign = false, style }) {
  const value = Number(amount || 0);
  const color = value > 0 ? COLORS.income : value < 0 ? COLORS.expense : COLORS.muted;
  return <Text style={[{ fontSize: size, fontWeight: '700', color }, style]}>{formatVND(value, showSign)}</Text>;
}
