import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import { api } from '../services/api.service';
import { COLORS, CATEGORY_COLORS } from '../utils/constants';
import { currentPeriod, formatVND } from '../utils/formatters';

const MONTHS_VI = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

function SkeletonBar({ w = '100%' }) {
  return <View style={{ width: w, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4 }} />;
}

export default function ReportScreen() {
  const now = currentPeriod();
  const [period, setPeriod] = useState(now);
  const [summary, setSummary] = useState({});
  const [breakdown, setBreakdown] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (m, y) => {
    setLoading(true);
    try {
      const [s, b, t] = await Promise.all([
        api.getReportSummary(m, y),
        api.getCategoryBreakdown(m, y),
        api.getMonthlyTrend(y),
      ]);
      setSummary(s.data || {});
      setBreakdown(b.data || []);
      setTrend(t.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period.month, period.year); }, [period.month, period.year]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(period.month, period.year);
    setRefreshing(false);
  }, [period.month, period.year, load]);

  function changeMonth(delta) {
    setPeriod((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m > 12) { m = 1; y++; }
      if (m < 1)  { m = 12; y--; }
      return { month: m, year: y };
    });
  }

  const maxExpense = Math.max(1, ...trend.map((item) => Number(item.expense)));

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
        <Text style={styles.errorTitle}>Không tải được dữ liệu</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load(period.month, period.year)}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(-1)}>
          <Text style={styles.monthBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>📅 Tháng {period.month}/{period.year}</Text>
        <TouchableOpacity
          style={[styles.monthBtn, period.month === now.month && period.year === now.year && styles.monthBtnDisabled]}
          onPress={() => changeMonth(1)}
          disabled={period.month === now.month && period.year === now.year}
        >
          <Text style={styles.monthBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      {loading ? (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <SkeletonBar w="60%" /><View style={{ height: 8 }} /><SkeletonBar w="80%" />
          </View>
          <View style={{ width: 8 }} />
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <SkeletonBar w="60%" /><View style={{ height: 8 }} /><SkeletonBar w="80%" />
          </View>
        </View>
      ) : (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.incomeCard]}>
            <Text style={styles.summaryLabel}>📈 Thu nhập</Text>
            <Text style={[styles.summaryValue, styles.incomeText]}>{formatVND(summary.total_income)}</Text>
          </View>
          <View style={{ width: 8 }} />
          <View style={[styles.summaryCard, styles.expenseCard]}>
            <Text style={styles.summaryLabel}>📉 Chi tiêu</Text>
            <Text style={[styles.summaryValue, styles.expenseText]}>{formatVND(summary.total_expense)}</Text>
          </View>
        </View>
      )}

      {/* Net */}
      {!loading && (
        <View style={[styles.netCard, Number(summary.net) >= 0 ? styles.netPositive : styles.netNegative]}>
          <Text style={styles.netLabel}>Chênh lệch</Text>
          <Text style={styles.netValue}>{formatVND(summary.net, true)}</Text>
          <Text style={styles.netSub}>{summary.transaction_count || 0} giao dịch</Text>
        </View>
      )}

      {/* Category breakdown */}
      <Text style={styles.sectionTitle}>Chi tiêu theo danh mục</Text>
      {loading ? (
        [1, 2, 3].map((i) => (
          <View key={i} style={[styles.catRow, { marginBottom: 8 }]}>
            <SkeletonBar w="40%" /><View style={{ height: 6 }} />
            <SkeletonBar /><View style={{ height: 4 }} />
            <SkeletonBar w="30%" />
          </View>
        ))
      ) : breakdown.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyMsg}>Chưa có dữ liệu chi tiêu tháng này</Text>
        </View>
      ) : (
        breakdown.map((item, index) => (
          <View key={item.category_id} style={styles.catRow}>
            <View style={styles.catHeader}>
              <Text style={styles.catName}>{item.icon} {item.category_name}</Text>
              <Text style={styles.catPct}>{item.percentage}%</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, {
                width: `${Math.min(100, item.percentage)}%`,
                backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
              }]} />
            </View>
            <Text style={styles.catAmount}>{formatVND(item.total)}</Text>
          </View>
        ))
      )}

      {/* Monthly trend bar chart */}
      <Text style={styles.sectionTitle}>Xu hướng chi tiêu 12 tháng</Text>
      <View style={styles.trendCard}>
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={{ flex: 1, height: Math.random() * 60 + 20, backgroundColor: '#E5E7EB', borderRadius: 4 }} />
            ))}
          </View>
        ) : trend.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyMsg}>Chưa có dữ liệu xu hướng</Text>
          </View>
        ) : (
          <View style={styles.trend}>
            {trend.map((item) => {
              const isCurrentMonth = item.month === period.month;
              const barHeight = Math.max(4, (Number(item.expense) / maxExpense) * 100);
              return (
                <View key={item.month} style={styles.trendMonth}>
                  {Number(item.income) > 0 && (
                    <View style={[styles.incomeBar, {
                      height: Math.max(2, (Number(item.income) / maxExpense) * 100),
                    }]} />
                  )}
                  <View style={[styles.expenseBar, { height: barHeight, opacity: isCurrentMonth ? 1 : 0.6 }]} />
                  <Text style={[styles.monthLabel, isCurrentMonth && styles.monthLabelActive]}>
                    {MONTHS_VI[(item.month - 1)] || item.month}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.expense }]} />
            <Text style={styles.legendText}>Chi tiêu</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.income }]} />
            <Text style={styles.legendText}>Thu nhập</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, padding: 12, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 14,
  },
  monthBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: COLORS.background },
  monthBtnText: { fontSize: 22, color: COLORS.primary, fontWeight: '900' },
  monthBtnDisabled: { opacity: 0.3 },
  monthTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  summaryRow: { flexDirection: 'row', marginBottom: 10 },
  summaryCard: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  incomeCard: { backgroundColor: '#F0FDF4' },
  expenseCard: { backgroundColor: '#FFF7ED' },
  summaryLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  summaryValue: { fontSize: 18, fontWeight: '900' },
  incomeText: { color: COLORS.income },
  expenseText: { color: COLORS.expense },

  netCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 10, marginBottom: 16,
  },
  netPositive: { backgroundColor: '#DCFCE7' },
  netNegative: { backgroundColor: '#FEE2E2' },
  netLabel: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
  netValue: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  netSub: { color: COLORS.muted, fontSize: 12 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 10, marginTop: 4 },

  catRow: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  catName: { fontWeight: '700', fontSize: 14 },
  catPct: { color: COLORS.muted, fontSize: 13 },
  barTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: 8, borderRadius: 4 },
  catAmount: { color: COLORS.muted, fontSize: 12 },

  trendCard: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  trend: { height: 120, flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, gap: 2 },
  trendMonth: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  incomeBar: { width: '60%', backgroundColor: COLORS.income, borderRadius: 3, opacity: 0.5 },
  expenseBar: { width: '80%', backgroundColor: COLORS.expense, borderRadius: 3 },
  monthLabel: { fontSize: 9, color: COLORS.muted, marginTop: 4 },
  monthLabelActive: { color: COLORS.primary, fontWeight: '800' },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.muted },

  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyMsg: { color: COLORS.muted, textAlign: 'center' },

  errorTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  errorMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
});
