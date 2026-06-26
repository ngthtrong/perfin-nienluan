import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { api } from '../services/api.service';
import { currentPeriod, formatVND } from '../utils/formatters';
import { COLORS } from '../utils/constants';
import BalanceDisplay from '../components/BalanceDisplay';
import TransactionCard from '../components/TransactionCard';
import AppIcon from '../components/AppIcon';

function SkeletonBox({ width = '100%', height = 16, style }) {
  return <View style={[{ width, height, backgroundColor: '#E5E7EB', borderRadius: 6 }, style]} />;
}

function DashboardSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      <View style={skStyles.card}>
        <SkeletonBox height={12} width="40%" />
        <SkeletonBox height={36} style={{ marginTop: 10 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
          <SkeletonBox width="45%" height={14} />
          <SkeletonBox width="45%" height={14} />
        </View>
        <SkeletonBox height={12} width="60%" style={{ marginTop: 8 }} />
      </View>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[skStyles.card, { marginTop: 10, padding: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <SkeletonBox width="55%" height={14} />
            <SkeletonBox width="25%" height={14} />
          </View>
          <SkeletonBox height={10} width="35%" style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, padding: 18, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
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
        <AppIcon name="warning" size={44} color={COLORS.expense} style={styles.stateIcon} />
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Balance card */}
      <View style={styles.balanceCard}>
        <View style={styles.labelRow}>
          <AppIcon name="account-balance-wallet" size={16} color={COLORS.muted} />
          <Text style={styles.walletLabel}>Ví tiền mặt</Text>
        </View>
        <BalanceDisplay amount={state.balance} size={32} />
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryLabelRow}>
              <AppIcon name="trending-up" size={15} color={COLORS.income} />
              <Text style={styles.summaryLabel}>Thu nhập</Text>
            </View>
            <Text style={[styles.summaryValue, styles.income]}>
              {formatVND(state.summary.total_income)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={styles.summaryLabelRow}>
              <AppIcon name="trending-down" size={15} color={COLORS.expense} />
              <Text style={styles.summaryLabel}>Chi tiêu</Text>
            </View>
            <Text style={[styles.summaryValue, styles.expense]}>
              {formatVND(state.summary.total_expense)}
            </Text>
          </View>
        </View>
        <View style={[styles.netBadge, netPositive ? styles.netPositive : styles.netNegative]}>
          <Text style={styles.netText}>
            {netPositive ? '▲' : '▼'} Chênh lệch tháng {period.month}: {formatVND(net, true)}
          </Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryAction} onPress={() => goTo('chat')} activeOpacity={0.8}>
          <AppIcon name="chat" size={18} color="#fff" />
          <Text style={styles.primaryActionText}>Nhập bằng Chat AI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={() => goTo('transactions')} activeOpacity={0.8}>
          <AppIcon name="edit" size={18} color={COLORS.text} />
          <Text style={styles.secondaryActionText}>Thêm thủ công</Text>
        </TouchableOpacity>
      </View>

      {/* Quick nav */}
      <View style={styles.quickNav}>
        {[
          { icon: 'account-balance-wallet', label: 'Ngân sách', tab: 'budgets' },
          { icon: 'bar-chart', label: 'Báo cáo', tab: 'reports' },
        ].map((item) => (
          <TouchableOpacity key={item.tab} style={styles.navItem} onPress={() => goTo(item.tab)}>
            <AppIcon name={item.icon} size={18} color={COLORS.primary} />
            <Text style={styles.navLabel}>{item.label}</Text>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent transactions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
        <TouchableOpacity onPress={() => goTo('transactions')}>
          <Text style={styles.seeAll}>Xem tất cả ›</Text>
        </TouchableOpacity>
      </View>

      {state.transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <AppIcon name="inbox" size={46} color={COLORS.muted} style={styles.stateIcon} />
          <Text style={styles.emptyTitle}>Chưa có giao dịch nào</Text>
          <Text style={styles.emptyMsg}>Hãy nhắn cho PERFIN khoản thu chi đầu tiên!</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => goTo('chat')}>
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
  content: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  // Balance card
  balanceCard: {
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  walletLabel: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  summaryRow: { flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: COLORS.border },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  summaryLabel: { color: COLORS.muted, fontSize: 12 },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  income: { color: COLORS.income },
  expense: { color: COLORS.expense },
  netBadge: { marginTop: 12, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  netPositive: { backgroundColor: '#D1FAE5' },
  netNegative: { backgroundColor: '#FEE2E2' },
  netText: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  // Actions
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  primaryAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, gap: 8,
  },
  primaryActionText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  secondaryAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, gap: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  secondaryActionText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },

  // Quick nav
  quickNav: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  navItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  navLabel: { flex: 1, fontWeight: '700', color: COLORS.text, fontSize: 13 },
  navArrow: { color: COLORS.muted, fontSize: 18 },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  seeAll: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  stateIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 16 },
  emptyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700' },

  // Error
  errorTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  errorMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
});
