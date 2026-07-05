import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';
import { formatVND } from '../utils/formatters';

const STATUS_COLORS = {
  safe:     COLORS.income,
  warning:  '#D97706',
  danger:   '#EA580C',
  exceeded: COLORS.expense,
};

export default function BudgetProgressBar({ percentage = 0, spent = 0, limit = 0, status = 'safe' }) {
  const clampedPct = Math.min(Number(percentage), 100);
  const color = STATUS_COLORS[status] || COLORS.primary;

  return (
    <View>
      {/* Track */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clampedPct}%`, backgroundColor: color }]} />
      </View>
      {/* Labels */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{formatVND(spent)} đã chi</Text>
        <Text style={[styles.pct, { color }]}>{Number(percentage).toFixed(1)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  fill: { height: 8, borderRadius: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  label: { color: COLORS.muted, fontSize: 12, fontWeight: '500' },
  pct: { fontSize: 12, fontWeight: '800' },
});
