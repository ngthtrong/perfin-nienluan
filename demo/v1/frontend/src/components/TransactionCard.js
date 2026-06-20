import { View, Text, StyleSheet } from 'react-native';
import BalanceDisplay from './BalanceDisplay';
import { COLORS } from '../utils/constants';
import { formatDate } from '../utils/formatters';

export default function TransactionCard({ transaction }) {
  const signAmount = transaction.type === 'income' ? Number(transaction.amount) : -Number(transaction.amount);
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{transaction.category_icon || '📦'}</Text>
      <View style={styles.main}>
        <Text style={styles.title}>{transaction.description}</Text>
        <Text style={styles.meta}>{transaction.category_name} · {formatDate(transaction.transaction_date)}</Text>
      </View>
      <BalanceDisplay amount={signAmount} showSign size={15} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  icon: { fontSize: 24, width: 34 },
  main: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  meta: { color: COLORS.muted, marginTop: 3 },
});
