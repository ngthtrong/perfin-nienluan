import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatVND } from '../utils/formatters';
import ProgressBar from './ui/ProgressBar';

export default function BudgetProgressBar({ percentage = 0, spent = 0, status = 'safe' }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const statusColor = { safe: c.income, warning: c.warning, danger: c.expense, exceeded: c.expense };
  const color = statusColor[status] || c.brand;

  return (
    <View>
      <ProgressBar percentage={percentage} color={color} style={{ marginVertical: 4 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flex: 1, color: c.textMuted, fontSize: 12, fontWeight: '500' }}>{formatVND(spent)} đã chi</Text>
        <Text numberOfLines={1} style={{ flexShrink: 0, fontSize: 12, fontWeight: '800', color }}>{Number(percentage).toFixed(1)}%</Text>
      </View>
    </View>
  );
}
