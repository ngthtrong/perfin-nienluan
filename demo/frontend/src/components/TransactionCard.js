// Vai trò: Hiển thị một giao dịch trong danh sách với số tiền và metadata chính.
// Luồng chính: suy chiều thu/chi, định dạng nội dung và mở thao tác khi card có handler.

import { useMemo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import BalanceDisplay from './BalanceDisplay';
import AppIcon from './AppIcon';
import { useTheme } from '../theme/ThemeContext';
import { formatDate, formatVND } from '../utils/formatters';

export default function TransactionCard({ transaction, onPress, onLongPress, expanded = false }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const isIncome = transaction.type === 'income';
  const signAmount = isIncome ? Number(transaction.amount) : -Number(transaction.amount);
  const interactive = Boolean(onPress || onLongPress);

  return (
    <TouchableOpacity
      accessible={interactive}
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={interactive
        ? `${transaction.description}, ${isIncome ? 'thu' : 'chi'} ${formatVND(transaction.amount)}. ${expanded ? 'Ẩn' : 'Mở'} thao tác giao dịch`
        : undefined}
      accessibilityState={interactive ? { expanded } : undefined}
      aria-expanded={interactive ? expanded : undefined}
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={onPress || onLongPress ? 0.7 : 1}
    >
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
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        )}
      </View>

      <View style={[styles.amountCol, interactive && styles.amountColInteractive]}>
        <BalanceDisplay amount={signAmount} showSign size={15} />
        {transaction.wallet_name && <Text numberOfLines={1} style={styles.wallet}>{transaction.wallet_name}</Text>}
      </View>

      {interactive && (
        <View style={styles.disclosure} accessible={false}>
          <AppIcon name={expanded ? 'expand-less' : 'more-horiz'} size={22} color={expanded ? c.brand : c.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (t) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  main: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '700', color: t.colors.text, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { flexShrink: 1, color: t.colors.textMuted, fontSize: 12, fontWeight: '500' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: t.colors.textMuted },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: t.colors.brandSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: t.radius.pill,
    marginTop: 4,
  },
  aiBadgeText: { color: t.colors.brandText, fontSize: 12, fontWeight: '700' },
  amountCol: { flexShrink: 1, maxWidth: '42%', alignItems: 'flex-end' },
  amountColInteractive: { maxWidth: '36%' },
  wallet: { maxWidth: '100%', color: t.colors.textMuted, fontSize: 12, marginTop: 2, fontWeight: '500' },
  disclosure: {
    width: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center',
    marginRight: -6,
  },
});
