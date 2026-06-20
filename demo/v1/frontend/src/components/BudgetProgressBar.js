import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';
import { formatVND } from '../utils/formatters';

const STATUS_COLORS = { safe: '#16A34A', warning: '#D97706', danger: '#DC2626', exceeded: '#991B1B' };

export default function BudgetProgressBar({ percentage = 0, spent = 0, limit = 0, status = 'safe' }) {
  const width = `${Math.min(Number(percentage), 100)}%`;
  return (
    <View>
      <View style={styles.track}>
        <View style={[styles.fill, { width, backgroundColor: STATUS_COLORS[status] || COLORS.primary }]} />
      </View>
      <Text style={styles.label}>{formatVND(spent)} / {formatVND(limit)} ({Number(percentage).toFixed(1)}%)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden', marginTop: 8 },
  fill: { height: 10, borderRadius: 5 },
  label: { color: COLORS.muted, marginTop: 6, fontSize: 13 },
});
