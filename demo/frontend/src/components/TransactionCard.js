import { useMemo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import BalanceDisplay from './BalanceDisplay';
import CategoryIcon from './CategoryIcon';
import { useTheme } from '../theme/ThemeContext';
import { formatDate } from '../utils/formatters';

export default function TransactionCard({ transaction, onPress, onLongPress }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const isIncome = transaction.type === 'income';
  const signAmount = isIncome ? Number(transaction.amount) : -Number(transaction.amount);
  const accent = isIncome ? c.income : c.expense;
  const accentSoft = isIncome ? c.incomeSoft : c.expenseSoft;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={onPress || onLongPress ? 0.7 : 1}
    >
      <View style={[styles.iconWrapper, { backgroundColor: accentSoft }]}>
        <CategoryIcon
          icon={transaction.category_icon}
          name={transaction.category_name}
          type={transaction.type}
          size={20}
          color={accent}
        />
      </View>

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

      <View style={styles.amountCol}>
        <BalanceDisplay amount={signAmount} showSign size={15} />
        {transaction.wallet_name && <Text style={styles.wallet}>{transaction.wallet_name}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (t) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: t.colors.border,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrapper: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: t.colors.text, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: t.colors.textMuted, fontSize: 12, fontWeight: '500' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: t.colors.textMuted },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: t.colors.brandSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: t.radius.pill,
    marginTop: 4,
  },
  aiBadgeText: { color: t.colors.brandText, fontSize: 10, fontWeight: '700' },
  amountCol: { alignItems: 'flex-end' },
  wallet: { color: t.colors.textMuted, fontSize: 10, marginTop: 2, fontWeight: '500' },
});
