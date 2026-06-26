import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import BalanceDisplay from './BalanceDisplay';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';
import { formatDate } from '../utils/formatters';

export default function TransactionCard({ transaction, onPress, onLongPress }) {
  const signAmount = transaction.type === 'income'
    ? Number(transaction.amount)
    : -Number(transaction.amount);
  const isIncome = transaction.type === 'income';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={onPress || onLongPress ? 0.7 : 1}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: isIncome ? COLORS.income : COLORS.expense }]} />

      {/* Icon */}
      <View style={[styles.iconWrapper, { backgroundColor: isIncome ? COLORS.incomeLight : COLORS.expenseLight }]}>
        <Text style={styles.icon}>{transaction.category_icon || '📦'}</Text>
      </View>

      {/* Main content */}
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>{transaction.description}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{transaction.category_name}</Text>
          {transaction.transaction_date && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.meta}>{formatDate(transaction.transaction_date)}</Text>
            </>
          )}
        </View>
        {transaction.source === 'ai_chat' && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✨ AI</Text>
          </View>
        )}
      </View>

      {/* Amount */}
      <View style={styles.amountCol}>
        <BalanceDisplay amount={signAmount} showSign size={15} />
        {transaction.wallet_name && (
          <Text style={styles.wallet}>{transaction.wallet_name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    gap: 12,
    paddingRight: 14,
    paddingVertical: 12,
    ...SHADOWS.sm,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderTopLeftRadius: RADIUS.md,
    borderBottomLeftRadius: RADIUS.md,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  main: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: COLORS.muted, fontSize: 12, fontWeight: '500' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.muted },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: 4,
  },
  aiBadgeText: { color: '#7C3AED', fontSize: 10, fontWeight: '700' },
  amountCol: { alignItems: 'flex-end' },
  wallet: { color: COLORS.muted, fontSize: 10, marginTop: 2, fontWeight: '500' },
});
