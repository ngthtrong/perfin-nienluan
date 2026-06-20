import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { api } from '../services/api.service';
import { COLORS, CATEGORY_COLORS } from '../utils/constants';
import { currentPeriod, formatVND } from '../utils/formatters';

export default function ReportScreen() {
  const period = currentPeriod();
  const [summary, setSummary] = useState({});
  const [breakdown, setBreakdown] = useState([]);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getReportSummary(period.month, period.year),
      api.getCategoryBreakdown(period.month, period.year),
      api.getMonthlyTrend(period.year),
    ]).then(([s, b, t]) => {
      setSummary(s.data);
      setBreakdown(b.data);
      setTrend(t.data);
    }).catch(() => {});
  }, []);

  const maxExpense = Math.max(1, ...trend.map((item) => item.expense));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.period}>Báo cáo tháng {period.month}, {period.year}</Text>
      <View style={styles.summary}>
        <View><Text style={styles.label}>Thu nhập</Text><Text style={styles.income}>{formatVND(summary.total_income)}</Text></View>
        <View><Text style={styles.label}>Chi tiêu</Text><Text style={styles.expense}>{formatVND(summary.total_expense)}</Text></View>
        <Text style={styles.net}>Chênh lệch: {formatVND(summary.net)} · {summary.transaction_count || 0} giao dịch</Text>
      </View>
      <Text style={styles.title}>Chi tiêu theo danh mục</Text>
      {breakdown.length ? breakdown.map((item, index) => (
        <View key={item.category_id} style={styles.row}>
          <Text style={styles.rowText}>{item.icon} {item.category_name}</Text>
          <View style={styles.barTrack}><View style={[styles.barFill, { width: `${item.percentage}%`, backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }]} /></View>
          <Text style={styles.amount}>{formatVND(item.total)} · {item.percentage}%</Text>
        </View>
      )) : <Text style={styles.empty}>Chưa có dữ liệu chi tiêu.</Text>}
      <Text style={styles.title}>Xu hướng chi tiêu 12 tháng</Text>
      <View style={styles.trend}>
        {trend.map((item) => (
          <View key={item.month} style={styles.month}>
            <View style={[styles.monthBar, { height: Math.max(4, (item.expense / maxExpense) * 110) }]} />
            <Text style={styles.monthLabel}>{item.month_name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  period: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  summary: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  label: { color: COLORS.muted },
  income: { color: COLORS.income, fontWeight: '800', fontSize: 18 },
  expense: { color: COLORS.expense, fontWeight: '800', fontSize: 18 },
  net: { marginTop: 10, color: COLORS.text, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800', marginVertical: 10 },
  row: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  rowText: { fontWeight: '700' },
  barTrack: { backgroundColor: '#E5E7EB', height: 8, borderRadius: 4, marginVertical: 8, overflow: 'hidden' },
  barFill: { height: 8 },
  amount: { color: COLORS.muted },
  trend: { height: 150, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  month: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  monthBar: { width: 12, backgroundColor: COLORS.expense, borderRadius: 4 },
  monthLabel: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  empty: { color: COLORS.muted },
});
