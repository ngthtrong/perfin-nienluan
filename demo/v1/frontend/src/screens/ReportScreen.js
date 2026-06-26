import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import { api } from '../services/api.service';
import { COLORS, CATEGORY_COLORS, SHADOWS, RADIUS } from '../utils/constants';
import { currentPeriod, formatVND } from '../utils/formatters';
import AppIcon from '../components/AppIcon';

const MONTHS_VI = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

function SkeletonBar({ w = '100%', h = 8 }) {
  return <View style={{ width: w, height: h, backgroundColor: COLORS.borderLight, borderRadius: 4 }} />;
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
  const netPositive = Number(summary.net ?? 0) >= 0;

  if (error) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIconWrap}>
          <AppIcon name="warning-amber" size={28} color={COLORS.expense} />
        </View>
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
      {/* ── Month navigator ── */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth(-1)}>
          <AppIcon name="chevron-left" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.monthTitle}>
          <AppIcon name="calendar-today" size={15} color={COLORS.primary} />
          <Text style={styles.monthTitleText}>Tháng {period.month} · {period.year}</Text>
        </View>
        <TouchableOpacity
          style={[styles.monthNavBtn, period.month === now.month && period.year === now.year && styles.monthNavBtnDisabled]}
          onPress={() => changeMonth(1)}
          disabled={period.month === now.month && period.year === now.year}
        >
          <AppIcon name="chevron-right" size={22} color={period.month === now.month && period.year === now.year ? COLORS.border : COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Summary cards ── */}
      {loading ? (
        <View style={styles.summaryRow}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.summaryCard}>
              <SkeletonBar w="60%" h={12} />
              <View style={{ height: 8 }} />
              <SkeletonBar w="80%" h={22} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.incomeCard]}>
            <View style={styles.summaryIcon}>
              <AppIcon name="trending-up" size={16} color={COLORS.income} />
            </View>
            <Text style={styles.summaryLabel}>Thu nhập</Text>
            <Text style={[styles.summaryValue, { color: COLORS.income }]}>{formatVND(summary.total_income)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.expenseCard]}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.expenseLight }]}>
              <AppIcon name="trending-down" size={16} color={COLORS.expense} />
            </View>
            <Text style={styles.summaryLabel}>Chi tiêu</Text>
            <Text style={[styles.summaryValue, { color: COLORS.expense }]}>{formatVND(summary.total_expense)}</Text>
          </View>
        </View>
      )}

      {/* ── Net card ── */}
      {!loading && (
        <View style={[styles.netCard, netPositive ? styles.netPositive : styles.netNegative]}>
          <View style={styles.netLeft}>
            <AppIcon name={netPositive ? 'savings' : 'money-off'} size={20} color={netPositive ? COLORS.income : COLORS.expense} />
            <Text style={styles.netLabel}>{netPositive ? 'Tiết kiệm được' : 'Bội chi'}</Text>
          </View>
          <View style={styles.netRight}>
            <Text style={[styles.netValue, { color: netPositive ? COLORS.income : COLORS.expense }]}>
              {formatVND(Math.abs(summary.net ?? 0), false)}
            </Text>
            <Text style={styles.netSub}>{summary.transaction_count || 0} giao dịch</Text>
          </View>
        </View>
      )}

      {/* ── Category breakdown ── */}
      <Text style={styles.sectionTitle}>Chi tiêu theo danh mục</Text>
      {loading ? (
        [1, 2, 3].map((i) => (
          <View key={i} style={[styles.catRow, { marginBottom: 8 }]}>
            <SkeletonBar w="40%" h={14} />
            <View style={{ height: 8 }} />
            <SkeletonBar h={10} />
            <View style={{ height: 6 }} />
            <SkeletonBar w="30%" h={11} />
          </View>
        ))
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
                <View style={styles.catRight}>
                  <Text style={styles.catPct}>{item.percentage}%</Text>
                  <Text style={styles.catAmount}>{formatVND(item.total)}</Text>
                </View>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, {
                  width: `${Math.min(100, item.percentage)}%`,
                  backgroundColor: color,
                }]} />
              </View>
            </View>
          );
        })
      )}

      {/* ── Monthly trend ── */}
      <Text style={styles.sectionTitle}>Xu hướng 12 tháng</Text>
      <View style={styles.trendCard}>
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 3 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={{ flex: 1, height: 30 + i * 5, backgroundColor: COLORS.borderLight, borderRadius: 4 }} />
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
              const expH = Math.max(4, (Number(item.expense) / maxExpense) * 100);
              const incH = Math.max(2, (Number(item.income) / maxExpense) * 100);
              return (
                <View key={item.month} style={styles.trendMonth}>
                  {Number(item.income) > 0 && (
                    <View style={[styles.incomeBar, { height: incH }]} />
                  )}
                  <View style={[
                    styles.expenseBar,
                    { height: expH },
                    isCurrentMonth && styles.expenseBarActive,
                  ]} />
                  <Text style={[styles.monthLabel, isCurrentMonth && styles.monthLabelActive]}>
                    {MONTHS_VI[(item.month - 1)] || item.month}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.legend}>
          {[
            { color: COLORS.expense, label: 'Chi tiêu' },
            { color: COLORS.income,  label: 'Thu nhập' },
          ].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  // ── Month nav ────────────────────────────────────────────────────────────────
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  monthNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavBtnDisabled: { backgroundColor: COLORS.background },
  monthTitle: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  monthTitleText: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  // ── Summary cards ─────────────────────────────────────────────────────────────
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  incomeCard: { backgroundColor: '#F0FDF4' },
  expenseCard: { backgroundColor: '#FFF1F2' },
  summaryIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.incomeLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  summaryLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 5, fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '900' },

  // ── Net card ──────────────────────────────────────────────────────────────────
  netCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: RADIUS.lg,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  netPositive: { backgroundColor: COLORS.incomeLight, borderWidth: 1, borderColor: COLORS.income + '40' },
  netNegative: { backgroundColor: COLORS.expenseLight, borderWidth: 1, borderColor: COLORS.expense + '40' },
  netLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  netRight: { alignItems: 'flex-end' },
  netLabel: { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  netValue: { fontSize: 18, fontWeight: '900' },
  netSub: { color: COLORS.muted, fontSize: 11, marginTop: 2 },

  // ── Section title ──────────────────────────────────────────────────────────────
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 12 },

  // ── Category rows ─────────────────────────────────────────────────────────────
  catRow: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontWeight: '700', fontSize: 14, color: COLORS.text },
  catRight: { alignItems: 'flex-end' },
  catPct: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  catAmount: { color: COLORS.textSecondary, fontSize: 12, marginTop: 1 },
  barTrack: { height: 8, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },

  // ── Trend ─────────────────────────────────────────────────────────────────────
  trendCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  trend: { height: 120, flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, gap: 3 },
  trendMonth: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  incomeBar: { width: '55%', backgroundColor: COLORS.income, borderRadius: 3, opacity: 0.4 },
  expenseBar: { width: '80%', backgroundColor: COLORS.expense, borderRadius: 3, opacity: 0.55 },
  expenseBarActive: { opacity: 1 },
  monthLabel: { fontSize: 9, color: COLORS.muted, marginTop: 4, fontWeight: '600' },
  monthLabelActive: { color: COLORS.primary, fontWeight: '900' },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },

  // ── Empty ─────────────────────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyMsg: { color: COLORS.muted, textAlign: 'center', fontWeight: '600' },

  // ── Error ─────────────────────────────────────────────────────────────────────
  errorIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.expenseLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  errorMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.full, ...SHADOWS.sm },
  retryText: { color: '#fff', fontWeight: '700' },
});
