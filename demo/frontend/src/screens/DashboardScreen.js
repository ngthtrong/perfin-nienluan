// Vai trò: Hiển thị bức tranh tài chính hiện tại và lối vào nhanh tới Chat AI.
// Luồng chính: tải song song số dư, tổng hợp kỳ và giao dịch gần đây rồi xử lý loading/error/refresh.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api.service';
import { currentPeriod, formatVND } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import {
  SectionHeader, EmptyState, ErrorState, Skeleton, SkeletonGroup, AppHeader,
} from '../components/ui';
import TransactionCard from '../components/TransactionCard';
import AppIcon from '../components/AppIcon';

function DashboardSkeleton({ styles }) {
  return (
    <SkeletonGroup label="Đang tải tổng quan" style={styles.skeletonContent}>
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
    </SkeletonGroup>
  );
}

// Điều phối ba nguồn dữ liệu của trang tổng quan và các trạng thái tải/lỗi tương ứng.
export default function DashboardScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const [state, setState] = useState({ loading: true, error: null, balance: 0, summary: {}, transactions: [] });
  const [refreshing, setRefreshing] = useState(false);
  const period = currentPeriod();

  // Tải song song để các con số trên Dashboard cùng đại diện một kỳ hiện tại.
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
        <AppHeader title="Tổng quan" />
        <DashboardSkeleton styles={styles} />
      </SafeAreaView>
    );
  }

  if (state.error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Tổng quan" />
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
      <AppHeader title="Tổng quan" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
      >
        {/* Balance hero */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text numberOfLines={1} style={styles.walletLabel}>Số dư khả dụng</Text>
            <Text numberOfLines={1} style={styles.periodLabel}>Tháng {period.month}/{period.year}</Text>
          </View>

          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.66} style={styles.balanceAmount}>{formatVND(state.balance)}</Text>

          <View style={styles.netBadge}>
            <Text style={[styles.netText, { color: netPositive ? c.income : c.expense }]}>
              {netPositive ? 'Tiết kiệm được ' : 'Bội chi '}
              <Text style={{ fontWeight: '700' }}>{formatVND(Math.abs(net))}</Text>
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Thu nhập</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.metricValue, { color: c.income }]}>
                {formatVND(incomeTotal)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Chi tiêu</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.metricValue, { color: c.expense }]}>
                {formatVND(expenseTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* Primary CTA — Chat AI */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Nhập giao dịch bằng Chat AI"
          style={styles.primaryAction}
          onPress={() => navigation.navigate('Chat')}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryActionText}>Nhập bằng Chat AI</Text>
            <Text style={styles.primaryActionSub}>Nhắn, nói hoặc chụp hóa đơn</Text>
          </View>
          <AppIcon name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        <SectionHeader title="Giao dịch gần đây" actionLabel="Xem tất cả" onAction={() => goTools('Transactions')} />

        {state.transactions.length === 0 ? (
          <EmptyState
            title="Chưa có giao dịch nào"
            message="Hãy nhắn cho PERFIN khoản thu chi đầu tiên!"
            actionLabel="Bắt đầu ngay"
            actionIcon="auto-awesome"
            onAction={() => navigation.navigate('Chat')}
          />
        ) : (
          state.transactions.slice(0, 3).map((tx) => <TransactionCard key={tx.id} transaction={tx} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 32 },
  skeletonContent: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16 },

  balanceCard: {
    backgroundColor: t.colors.surface,
    padding: 20,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.colors.border,
    marginBottom: 14,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  walletLabel: { color: t.colors.textSecondary, fontWeight: '600', fontSize: 14 },
  periodLabel: { flexShrink: 0, fontSize: 12, color: t.colors.textMuted, fontWeight: '500' },
  balanceAmount: { fontSize: 34, lineHeight: 42, fontWeight: '700', color: t.colors.text, marginBottom: 6 },

  netBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
  },
  netText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.colors.border },
  metric: { flex: 1, minWidth: 0 },
  metricDivider: { width: 1, backgroundColor: t.colors.border, marginHorizontal: 14 },
  metricLabel: { color: t.colors.textMuted, fontSize: 12, lineHeight: 16, fontWeight: '600', marginBottom: 4 },
  metricValue: { fontSize: 18, lineHeight: 26, fontWeight: '700' },

  primaryAction: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.colors.brand, padding: 16, borderRadius: t.radius.md, marginBottom: 24,
  },
  primaryActionText: { color: t.colors.onBrand, fontWeight: '700', fontSize: 16 },
  primaryActionSub: { color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 18, fontWeight: '400', marginTop: 2 },
});
