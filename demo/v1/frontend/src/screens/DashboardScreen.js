import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../services/api.service';
import { currentPeriod, formatVND } from '../utils/formatters';
import { COLORS } from '../utils/constants';
import BalanceDisplay from '../components/BalanceDisplay';
import TransactionCard from '../components/TransactionCard';

export default function DashboardScreen({ goTo }) {
  const [state, setState] = useState({ loading: true, balance: 0, summary: {}, transactions: [] });
  const period = currentPeriod();

  async function load() {
    setState((prev) => ({ ...prev, loading: true }));
    const [balance, summary, transactions] = await Promise.all([
      api.getBalance(),
      api.getSummary(period.month, period.year),
      api.getTransactions('?limit=5'),
    ]);
    setState({ loading: false, balance: balance.data.total_balance, summary: summary.data, transactions: transactions.data });
  }

  useEffect(() => { load().catch(() => setState((prev) => ({ ...prev, loading: false }))); }, []);

  if (state.loading) return <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.balanceCard}>
        <Text style={styles.wallet}>Tiền mặt</Text>
        <BalanceDisplay amount={state.balance} size={30} />
        <View style={styles.summaryRow}>
          <Text>Thu: <Text style={styles.income}>{formatVND(state.summary.total_income)}</Text></Text>
          <Text>Chi: <Text style={styles.expense}>{formatVND(state.summary.total_expense)}</Text></Text>
        </View>
        <Text style={styles.net}>Chênh lệch tháng {period.month}: {formatVND(state.summary.net, true)}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={() => goTo('chat')}><Text style={styles.actionText}>Chat</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionMuted} onPress={() => goTo('transactions')}><Text>Thêm giao dịch</Text></TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
      {state.transactions.length ? state.transactions.map((tx) => <TransactionCard key={tx.id} transaction={tx} />) : <Text style={styles.empty}>Chưa có giao dịch nào.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  balanceCard: { backgroundColor: COLORS.surface, padding: 18, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  wallet: { color: COLORS.muted, fontWeight: '700', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  income: { color: COLORS.income, fontWeight: '700' },
  expense: { color: COLORS.expense, fontWeight: '700' },
  net: { color: COLORS.muted, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginVertical: 16 },
  action: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  actionMuted: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  actionText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10, color: COLORS.text },
  empty: { color: COLORS.muted },
});
