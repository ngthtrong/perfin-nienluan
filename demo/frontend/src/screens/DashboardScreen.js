import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api.service';
import { currentPeriod, formatVND } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import { StatCard, SectionHeader, EmptyState, ErrorState, Skeleton, AppHeader } from '../components/ui';
import TransactionCard from '../components/TransactionCard';
import AppIcon from '../components/AppIcon';

function DashboardSkeleton({ styles }) {
  return (
    <View style={{ padding: 16 }}>
      <View style={[styles.balanceCard, { marginBottom: 14 }]}>
        <Skeleton height={12} width="35%" />
        <Skeleton height={40} style={{ marginTop: 12 }} />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Skeleton width="48%" height={70} radius={16} />
          <Skeleton width="48%" height={70} radius={16} />
        </View>
      </View>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} height={66} radius={14} style={{ marginBottom: 8 }} />
      ))}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

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

  const goTools = (screen) => navigation.navigate('More', { screen });

  if (state.loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader />
        <DashboardSkeleton styles={styles} />
      </SafeAreaView>
    );
  }

  if (state.error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader />
        <ErrorState message={state.error} onRetry={() => { setState((p) => ({ ...p, loading: true, error: null })); load(); }} />
      </SafeAreaView>
    );
  }

  const net = Number(state.summary.net ?? 0);
  const netPositive = net >= 0;
  const incomeTotal = state.summary.total_income || 0;
  const expenseTotal = state.summary.total_expense || 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
      >
        {/* Balance hero */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.walletChip}>
              <AppIcon name="account-balance-wallet" size={13} color={c.brandText} />
              <Text style={styles.walletLabel}>Số dư khả dụng</Text>
            </View>
            <Text style={styles.periodLabel}>Tháng {period.month}/{period.year}</Text>
          </View>

          <Text style={styles.balanceAmount}>{formatVND(state.balance)}</Text>

          <View style={[styles.netBadge, { backgroundColor: netPositive ? c.incomeSoft : c.expenseSoft }]}>
            <AppIcon name={netPositive ? 'arrow-upward' : 'arrow-downward'} size={13} color={netPositive ? c.income : c.expense} />
            <Text style={[styles.netText, { color: netPositive ? c.income : c.expense }]}>
              {netPositive ? 'Tiết kiệm được ' : 'Bội chi '}
              <Text style={{ fontWeight: '900' }}>{formatVND(Math.abs(net))}</Text>
            </Text>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Thu nhập" value={formatVND(incomeTotal)} icon="trending-up" tone="income" />
            <StatCard label="Chi tiêu" value={formatVND(expenseTotal)} icon="trending-down" tone="expense" />
          </View>
        </View>

        {/* Primary CTA — Chat AI */}
        <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('Chat')} activeOpacity={0.85}>
          <View style={styles.actionIcon}>
            <AppIcon name="auto-awesome" size={20} color={c.onBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryActionText}>Nhập bằng Chat AI</Text>
            <Text style={styles.primaryActionSub}>Nhắn, nói hoặc chụp hóa đơn</Text>
          </View>
          <AppIcon name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* Quick nav */}
        <View style={styles.quickNav}>
          {[
            { icon: 'account-balance-wallet', label: 'Ngân sách', onPress: () => navigation.navigate('Budget'), tone: c.brand, bg: c.brandSoft },
            { icon: 'bar-chart', label: 'Báo cáo', onPress: () => navigation.navigate('Report'), tone: c.info, bg: c.infoSoft },
            { icon: 'format-list-bulleted', label: 'Giao dịch', onPress: () => goTools('Transactions'), tone: c.income, bg: c.incomeSoft },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.navItem} onPress={item.onPress} activeOpacity={0.75}>
              <View style={[styles.navIcon, { backgroundColor: item.bg }]}>
                <AppIcon name={item.icon} size={20} color={item.tone} />
              </View>
              <Text style={styles.navLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Giao dịch gần đây" actionLabel="Xem tất cả" onAction={() => goTools('Transactions')} />

        {state.transactions.length === 0 ? (
          <EmptyState
            emoji="💬"
            title="Chưa có giao dịch nào"
            message="Hãy nhắn cho PERFIN khoản thu chi đầu tiên!"
            actionLabel="Bắt đầu ngay"
            actionIcon="auto-awesome"
            onAction={() => navigation.navigate('Chat')}
          />
        ) : (
          state.transactions.map((tx) => <TransactionCard key={tx.id} transaction={tx} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  content: { padding: 16, paddingBottom: 32 },

  balanceCard: {
    backgroundColor: t.colors.surface,
    padding: 20,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.colors.border,
    marginBottom: 14,
    ...t.shadows.sm,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  walletChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: t.colors.brandSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: t.radius.pill,
  },
  walletLabel: { color: t.colors.brandText, fontWeight: '700', fontSize: 12 },
  periodLabel: { fontSize: 12, color: t.colors.textMuted, fontWeight: '600' },
  balanceAmount: { fontSize: 34, fontWeight: '900', color: t.colors.text, marginBottom: 12 },

  netBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: t.radius.pill, alignSelf: 'flex-start',
  },
  netText: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },

  primaryAction: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.colors.brand, padding: 16, borderRadius: t.radius.lg, marginBottom: 14, ...t.shadows.md,
  },
  actionIcon: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  primaryActionText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  primaryActionSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500', marginTop: 2 },

  quickNav: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  navItem: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: t.colors.surface, paddingVertical: 16, borderRadius: t.radius.lg,
    borderWidth: 1, borderColor: t.colors.border,
  },
  navIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontWeight: '700', color: t.colors.text, fontSize: 12 },
});
