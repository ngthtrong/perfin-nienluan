import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api.service';
import { CATEGORY_COLORS } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { currentPeriod, formatDate, formatVND } from '../utils/formatters';
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
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (m, y, freshInsights = false) => {
    setLoading(true);
    try {
      const [s, b, t, i] = await Promise.all([
        api.getReportSummary(m, y),
        api.getCategoryBreakdown(m, y),
        api.getMonthlyTrend(y),
        api.getReportInsights({ payday: 25, fresh: freshInsights }).catch(() => null),
      ]);
      setSummary(s.data || {});
      setBreakdown(b.data || []);
      setTrend(t.data || []);
      setInsights(i?.data || null);
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
    await load(period.month, period.year, true);
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

        <Text style={styles.sectionTitle}>Phân tích thông minh</Text>
        {loading ? (
          <Skeleton height={144} radius={18} style={{ marginBottom: 12 }} />
        ) : insights ? (
          <>
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={styles.insightIcon}>
                  <AppIcon name="auto-awesome" size={18} color={c.onBrand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightTitle}>Góc nhìn từ {insights.persona?.name || 'PERFIN'}</Text>
                  <Text style={styles.insightProvider}>{insights.provider_used || 'Phân tích cục bộ'}</Text>
                </View>
              </View>
              <Text style={styles.insightComment}>{insights.ai_comment}</Text>
            </View>

            {insights.facts?.runway && (
              <View style={[styles.analyticsCard, insights.facts.runway.beforePayday && styles.analyticsWarningCard]}>
                <View style={styles.analyticsHeader}>
                  <View style={[styles.analyticsIcon, { backgroundColor: insights.facts.runway.beforePayday ? c.warningSoft : c.infoSoft }]}>
                    <AppIcon name="hourglass-bottom" size={17} color={insights.facts.runway.beforePayday ? c.warning : c.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.analyticsTitle}>Đường băng dòng tiền</Text>
                    <Text style={styles.analyticsSubtitle}>Ước tính từ nhịp chi 14 ngày gần đây</Text>
                  </View>
                  <Text style={[styles.runwayDays, { color: insights.facts.runway.beforePayday ? c.warning : c.info }]}>
                    {insights.facts.runway.daysLeft} ngày
                  </Text>
                </View>
                <View style={styles.runwayStats}>
                  <View style={styles.runwayStat}>
                    <Text style={styles.runwayStatLabel}>Số dư</Text>
                    <Text style={styles.runwayStatValue}>{formatVND(insights.facts.runway.totalBalance)}</Text>
                  </View>
                  <View style={styles.runwayStat}>
                    <Text style={styles.runwayStatLabel}>Chi trung bình/ngày</Text>
                    <Text style={styles.runwayStatValue}>{formatVND(insights.facts.runway.avgBurn)}</Text>
                  </View>
                  <View style={styles.runwayStat}>
                    <Text style={styles.runwayStatLabel}>Dự kiến cạn</Text>
                    <Text style={styles.runwayStatValue}>{formatDate(insights.facts.runway.depletionDate)}</Text>
                  </View>
                </View>
                {insights.facts.runway.beforePayday && (
                  <View style={styles.runwayWarning}>
                    <AppIcon name="warning-amber" size={15} color={c.warning} />
                    <Text style={styles.runwayWarningText}>
                      Có thể cạn trước kỳ lương khoảng {insights.facts.runway.daysBeforePayday} ngày.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {insights.facts?.subscriptions?.subscriptions?.length > 0 && (
              <View style={styles.analyticsCard}>
                <View style={styles.analyticsHeader}>
                  <View style={[styles.analyticsIcon, { backgroundColor: c.brandSoft }]}>
                    <AppIcon name="subscriptions" size={17} color={c.brandText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.analyticsTitle}>Khoản chi có dấu hiệu đăng ký</Text>
                    <Text style={styles.analyticsSubtitle}>
                      Khoảng {formatVND(insights.facts.subscriptions.totalMonthly)}/tháng
                    </Text>
                  </View>
                  <View style={styles.analyticsCount}>
                    <Text style={styles.analyticsCountText}>{insights.facts.subscriptions.subscriptions.length}</Text>
                  </View>
                </View>
                {insights.facts.subscriptions.subscriptions.slice(0, 5).map((subscription, index) => (
                  <View key={`${subscription.label}-${index}`} style={[styles.subscriptionRow, index > 0 && styles.subscriptionBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subscriptionName} numberOfLines={1}>{subscription.label}</Text>
                      <Text style={styles.subscriptionMeta}>
                        {subscription.occurrences} lần{subscription.cadenceDays ? ` · chu kỳ ~${subscription.cadenceDays} ngày` : ''}
                      </Text>
                    </View>
                    <Text style={styles.subscriptionAmount}>{formatVND(subscription.monthlyEstimate)}/tháng</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyMsg}>Chưa đủ dữ liệu để tạo phân tích thông minh</Text>
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

  insightCard: {
    backgroundColor: t.colors.brandSoft, padding: 16, borderRadius: t.radius.lg,
    borderWidth: 1.5, borderColor: t.colors.brand, marginBottom: 10,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 },
  insightIcon: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: t.colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  insightTitle: { color: t.colors.text, fontSize: 14, fontWeight: '900' },
  insightProvider: { color: t.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  insightComment: { color: t.colors.textSecondary, fontSize: 13, lineHeight: 19, fontWeight: '600' },

  analyticsCard: {
    backgroundColor: t.colors.surface, padding: 15, borderRadius: t.radius.lg,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: 10, ...t.shadows.sm,
  },
  analyticsWarningCard: { borderColor: t.colors.warning },
  analyticsHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  analyticsIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  analyticsTitle: { color: t.colors.text, fontSize: 13, fontWeight: '900' },
  analyticsSubtitle: { color: t.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  analyticsCount: {
    minWidth: 27, height: 27, paddingHorizontal: 7, borderRadius: 14,
    backgroundColor: t.colors.brandSoft, alignItems: 'center', justifyContent: 'center',
  },
  analyticsCountText: { color: t.colors.brandText, fontSize: 11, fontWeight: '900' },
  runwayDays: { fontSize: 19, fontWeight: '900' },
  runwayStats: { flexDirection: 'row', marginTop: 13, gap: 6 },
  runwayStat: { flex: 1, padding: 8, borderRadius: t.radius.sm, backgroundColor: t.colors.surfaceAlt },
  runwayStatLabel: { color: t.colors.textMuted, fontSize: 9, fontWeight: '700', marginBottom: 3 },
  runwayStatValue: { color: t.colors.textSecondary, fontSize: 10, fontWeight: '800' },
  runwayWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    padding: 8, borderRadius: t.radius.sm, backgroundColor: t.colors.warningSoft,
  },
  runwayWarningText: { flex: 1, color: t.colors.warning, fontSize: 10, fontWeight: '700' },
  subscriptionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  subscriptionBorder: { borderTopWidth: 1, borderTopColor: t.colors.border },
  subscriptionName: { color: t.colors.text, fontSize: 12, fontWeight: '800' },
  subscriptionMeta: { color: t.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  subscriptionAmount: { color: t.colors.expense, fontSize: 10, fontWeight: '800' },

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
