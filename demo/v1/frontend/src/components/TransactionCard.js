import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import BalanceDisplay from './BalanceDisplay';
import { COLORS } from '../utils/constants';
import { formatDate } from '../utils/formatters';

export default function TransactionCard({ transaction, onPress, onLongPress }) {
  const signAmount = transaction.type === 'income'
    ? Number(transaction.amount)
    : -Number(transaction.amount);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={onPress || onLongPress ? 0.75 : 1}
    >
      <View style={styles.iconWrapper}>
        <Text style={styles.icon}>{transaction.category_icon || '📦'}</Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>{transaction.description}</Text>
        <Text style={styles.meta}>
          {transaction.category_name}
          {transaction.transaction_date ? ` · ${formatDate(transaction.transaction_date)}` : ''}
        </Text>
        {transaction.source === 'ai_chat' && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✨ AI</Text>
          </View>
        )}
      </View>
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
    padding: 13,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  main: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  meta: { color: COLORS.muted, marginTop: 2, fontSize: 12 },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  aiBadgeText: { color: '#7C3AED', fontSize: 10, fontWeight: '700' },
  amountCol: { alignItems: 'flex-end' },
  wallet: { color: COLORS.muted, fontSize: 10, marginTop: 2 },
});
