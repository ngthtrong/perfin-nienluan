import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api.service';
import { CATEGORY_COLORS } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { currentPeriod, formatVND } from '../utils/formatters';
import AppIcon from '../components/AppIcon';
import { AppHeader, StatCard, ProgressBar, ErrorState, Skeleton } from '../components/ui';

const MONTHS_VI = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

export default function ReportScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;
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
      if (m < 1) { m = 12; y--; }
      return { month: m, year: y };
    });
  }

  const maxExpense = Math.max(1, ...trend.map((item) => Number(item.expense)));
  const netPositive = Number(summary.net ?? 0) >= 0;
  const isCurrent = period.month === now.month && period.year === now.year;

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader subtitle="Báo cáo" showAIStatus={false} />
        <ErrorState message={error} onRetry={() => load(period.month, period.year)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader subtitle="Báo cáo" showAIStatus={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
      >
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth(-1)}>
            <AppIcon name="chevron-left" size={22} color={c.brandText} />
          </TouchableOpacity>
          <View style={styles.monthTitle}>
            <AppIcon name="calendar-today" size={15} color={c.brandText} />
            <Text style={styles.monthTitleText}>Tháng {period.month} · {period.year}</Text>
          </View>
          <TouchableOpacity
            style={[styles.monthNavBtn, isCurrent && styles.monthNavBtnDisabled]}
            onPress={() => changeMonth(1)}
            disabled={isCurrent}
          >
            <AppIcon name="chevron-right" size={22} color={isCurrent ? c.border : c.brandText} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <Skeleton height={96} radius={18} style={{ flex: 1 }} />
            <Skeleton height={96} radius={18} style={{ flex: 1 }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <StatCard label="Thu nhập" value={formatVND(summary.total_income)} icon="trending-up" tone="income" />
            <StatCard label="Chi tiêu" value={formatVND(summary.total_expense)} icon="trending-down" tone="expense" />
          </View>
        )}

        {!loading && (
          <View style={[styles.netCard, { backgroundColor: netPositive ? c.incomeSoft : c.expenseSoft }]}>
            <View style={styles.netLeft}>
              <AppIcon name={netPositive ? 'savings' : 'money-off'} size={20} color={netPositive ? c.income : c.expense} />
              <Text style={styles.netLabel}>{netPositive ? 'Tiết kiệm được' : 'Bội chi'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.netValue, { color: netPositive ? c.income : c.expense }]}>
                {formatVND(Math.abs(summary.net ?? 0))}
              </Text>
              <Text style={styles.netSub}>{summary.transaction_count || 0} giao dịch</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Chi tiêu theo danh mục</Text>
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} height={70} radius={14} style={{ marginBottom: 8 }} />)
        ) : breakdown.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyMsg}>Chưa có dữ liệu chi tiêu tháng này</Text>
          </View>
        ) : (
          breakdown.map((item, index) => {
            const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            return (
              <View key={item.category_id} style={styles.catRow}>
                <View style={styles.catHeader}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catDot, { backgroundColor: color }]} />
                    <Text style={styles.catName}>{item.icon} {item.category_name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.catPct}>{item.percentage}%</Text>
                    <Text style={styles.catAmount}>{formatVND(item.total)}</Text>
                  </View>
                </View>
                <ProgressBar percentage={item.percentage} color={color} />
              </View>
            );
          })
        )}

        <Text style={styles.sectionTitle}>Xu hướng 12 tháng</Text>
        <View style={styles.trendCard}>
          {loading ? (
            <Skeleton height={110} radius={8} />
          ) : trend.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyMsg}>Chưa có dữ liệu xu hướng</Text>
            </View>
          ) : (
            <View style={styles.trend}>
              {trend.map((item) => {
                const isCurrentMonth = item.month === period.month;
                const expH = Math.max(4, (Number(item.expense) / maxExpense) * 100);
                const incH = Math.max(2, (Number(item.income) / maxExpense) * 100);
                return (
                  <View key={item.month} style={styles.trendMonth}>
                    {Number(item.income) > 0 && <View style={[styles.incomeBar, { height: incH }]} />}
                    <View style={[styles.expenseBar, { height: expH }, isCurrentMonth && styles.expenseBarActive]} />
                    <Text style={[styles.monthLabel, isCurrentMonth && styles.monthLabelActive]}>
                      {MONTHS_VI[item.month - 1] || item.month}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          <View style={styles.legend}>
            {[{ color: c.expense, label: 'Chi tiêu' }, { color: c.income, label: 'Thu nhập' }].map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  content: { padding: 16, paddingBottom: 32 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: t.colors.surface, padding: 12, borderRadius: t.radius.lg,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: 14, ...t.shadows.sm,
  },
  monthNavBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  monthNavBtnDisabled: { backgroundColor: t.colors.surfaceAlt },
  monthTitle: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  monthTitleText: { fontSize: 16, fontWeight: '800', color: t.colors.text },

  netCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: t.radius.lg, marginBottom: 20,
  },
  netLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  netLabel: { fontWeight: '700', color: t.colors.text, fontSize: 14 },
  netValue: { fontSize: 18, fontWeight: '900' },
  netSub: { color: t.colors.textMuted, fontSize: 11, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: t.colors.text, marginBottom: 12 },

  catRow: {
    backgroundColor: t.colors.surface, padding: 14, borderRadius: t.radius.md,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: 8, ...t.shadows.sm,
  },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontWeight: '700', fontSize: 14, color: t.colors.text },
  catPct: { color: t.colors.textSecondary, fontSize: 13, fontWeight: '700' },
  catAmount: { color: t.colors.textMuted, fontSize: 12, marginTop: 1 },

  trendCard: {
    backgroundColor: t.colors.surface, padding: 16, borderRadius: t.radius.lg,
    borderWidth: 1, borderColor: t.colors.border, ...t.shadows.sm,
  },
  trend: { height: 120, flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, gap: 3 },
  trendMonth: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  incomeBar: { width: '55%', backgroundColor: t.colors.income, borderRadius: 3, opacity: 0.45 },
  expenseBar: { width: '80%', backgroundColor: t.colors.expense, borderRadius: 3, opacity: 0.55 },
  expenseBarActive: { opacity: 1 },
  monthLabel: { fontSize: 9, color: t.colors.textMuted, marginTop: 4, fontWeight: '600' },
  monthLabelActive: { color: t.colors.brandText, fontWeight: '900' },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: t.colors.textMuted, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyMsg: { color: t.colors.textMuted, textAlign: 'center', fontWeight: '600' },
});
