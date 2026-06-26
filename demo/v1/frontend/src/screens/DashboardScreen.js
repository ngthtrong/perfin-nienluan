import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { api } from '../services/api.service';
import { currentPeriod, formatVND } from '../utils/formatters';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';
import BalanceDisplay from '../components/BalanceDisplay';
import TransactionCard from '../components/TransactionCard';
import AppIcon from '../components/AppIcon';

function SkeletonBox({ width = '100%', height = 16, style }) {
  return <View style={[{ width, height, backgroundColor: COLORS.borderLight, borderRadius: 6 }, style]} />;
}

function DashboardSkeleton() {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Balance skeleton */}
      <View style={[skStyles.card, { marginBottom: 14 }]}>
        <SkeletonBox height={12} width="35%" />
        <SkeletonBox height={40} style={{ marginTop: 12 }} />
        <SkeletonBox height={1} style={{ marginVertical: 14, backgroundColor: COLORS.border }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonBox width="42%" height={40} />
          <SkeletonBox width="42%" height={40} />
        </View>
      </View>
      {/* Quick action skeletons */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <SkeletonBox width="48%" height={52} style={{ borderRadius: RADIUS.md }} />
        <SkeletonBox width="48%" height={52} style={{ borderRadius: RADIUS.md }} />
      </View>
      {/* Transactions skeletons */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={[skStyles.card, { marginBottom: 8, padding: 14 }]}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SkeletonBox width={40} height={40} style={{ borderRadius: 20 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox height={14} width="60%" />
              <SkeletonBox height={10} width="40%" />
            </View>
            <SkeletonBox width={60} height={14} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const skStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, padding: 18, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
});

export default function DashboardScreen({ goTo }) {
  const [state, setState] = useState({ loading: true, error: null, balance: 0, summary: {}, transactions: [] });
  const [refreshing, setRefreshing] = useState(false);
  const period = currentPeriod();

  const load = useCallback(async () => {
    try {
      const [balance, summary, transactions] = await Promise.all([
        api.getBalance(),
        api.getSummary(period.month, period.year),
        api.getTransactions('?limit=5'),
      ]);
      setState({
        loading: false,
        error: null,
        balance: Number(balance.data?.total_balance ?? 0),
        summary: summary.data || {},
        transactions: transactions.data || [],
      });
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, [period.month, period.year]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (state.loading) return <DashboardSkeleton />;

  if (state.error) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIcon}>
          <AppIcon name="warning-amber" size={28} color={COLORS.expense} />
        </View>
        <Text style={styles.errorTitle}>Không tải được dữ liệu</Text>
        <Text style={styles.errorMsg}>{state.error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setState((p) => ({ ...p, loading: true, error: null })); load(); }}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const net = state.summary.net ?? 0;
  const netPositive = Number(net) >= 0;
  const incomeTotal = state.summary.total_income || 0;
  const expenseTotal = state.summary.total_expense || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* ── Balance card ── */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <View style={styles.walletChip}>
            <AppIcon name="account-balance-wallet" size={13} color={COLORS.primary} />
            <Text style={styles.walletLabel}>Ví tiền mặt</Text>
          </View>
          <Text style={styles.periodLabel}>Tháng {period.month}/{period.year}</Text>
        </View>

        <BalanceDisplay amount={state.balance} size={34} style={styles.balanceAmount} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.incomeLight }]}>
              <AppIcon name="trending-up" size={14} color={COLORS.income} />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Thu nhập</Text>
              <Text style={[styles.summaryValue, { color: COLORS.income }]}>{formatVND(incomeTotal)}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.expenseLight }]}>
              <AppIcon name="trending-down" size={14} color={COLORS.expense} />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Chi tiêu</Text>
              <Text style={[styles.summaryValue, { color: COLORS.expense }]}>{formatVND(expenseTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Net badge */}
        <View style={[styles.netBadge, netPositive ? styles.netPositive : styles.netNegative]}>
          <AppIcon name={netPositive ? 'arrow-upward' : 'arrow-downward'} size={13} color={netPositive ? COLORS.income : COLORS.expense} />
          <Text style={[styles.netText, { color: netPositive ? COLORS.income : COLORS.expense }]}>
            {netPositive ? 'Tiết kiệm được ' : 'Bội chi '}
            <Text style={{ fontWeight: '900' }}>{formatVND(Math.abs(net), false)}</Text>
          </Text>
        </View>
      </View>

      {/* ── Quick actions ── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryAction} onPress={() => goTo('chat')} activeOpacity={0.8}>
          <View style={styles.actionIcon}>
            <AppIcon name="auto-awesome" size={18} color="#fff" />
          </View>
          <Text style={styles.primaryActionText}>Nhập bằng Chat AI</Text>
          <AppIcon name="chevron-right" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={() => goTo('transactions')} activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
            <AppIcon name="edit" size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.secondaryActionText}>Thêm thủ công</Text>
          <AppIcon name="chevron-right" size={18} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* ── Quick nav ── */}
      <View style={styles.quickNav}>
        {[
          { icon: 'account-balance-wallet', label: 'Ngân sách', tab: 'budgets', color: '#8B5CF6', bg: '#F5F3FF' },
          { icon: 'bar-chart', label: 'Báo cáo', tab: 'reports', color: '#06B6D4', bg: '#ECFEFF' },
        ].map((item) => (
          <TouchableOpacity key={item.tab} style={styles.navItem} onPress={() => goTo(item.tab)}>
            <View style={[styles.navIcon, { backgroundColor: item.bg }]}>
              <AppIcon name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={styles.navLabel}>{item.label}</Text>
            <AppIcon name="chevron-right" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Recent transactions ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
        <TouchableOpacity onPress={() => goTo('transactions')} style={styles.seeAllBtn}>
          <Text style={styles.seeAll}>Xem tất cả</Text>
          <AppIcon name="chevron-right" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {state.transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIconText}>💬</Text>
          </View>
          <Text style={styles.emptyTitle}>Chưa có giao dịch nào</Text>
          <Text style={styles.emptyMsg}>Hãy nhắn cho PERFIN khoản thu chi đầu tiên!</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => goTo('chat')}>
            <AppIcon name="auto-awesome" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Bắt đầu ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        state.transactions.map((tx) => <TransactionCard key={tx.id} transaction={tx} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  // ── Balance card ────────────────────────────────────────────────────────────
  balanceCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  walletLabel: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  periodLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  balanceAmount: { marginBottom: 16 },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  summaryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  summaryDivider: { width: 1, backgroundColor: COLORS.border },
  summaryLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  summaryValue: { fontSize: 15, fontWeight: '800' },

  netBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  netPositive: { backgroundColor: COLORS.incomeLight },
  netNegative: { backgroundColor: COLORS.expenseLight },
  netText: { fontSize: 13, fontWeight: '700' },

  // ── Actions ─────────────────────────────────────────────────────────────────
  actions: { gap: 10, marginBottom: 12 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  secondaryActionText: { flex: 1, color: COLORS.text, fontWeight: '700', fontSize: 15 },

  // ── Quick nav ────────────────────────────────────────────────────────────────
  quickNav: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  navItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  navIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1, fontWeight: '700', color: COLORS.text, fontSize: 13 },

  // ── Section header ───────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  // ── Empty state ──────────────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIconText: { fontSize: 36 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 20, fontSize: 14, paddingHorizontal: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.full, ...SHADOWS.sm },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Error ────────────────────────────────────────────────────────────────────
  errorIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.expenseLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  errorMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 20, fontSize: 14 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.full, ...SHADOWS.sm },
  retryText: { color: '#fff', fontWeight: '700' },
});
