import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import BalanceDisplay from './BalanceDisplay';
import AppIcon from './AppIcon';
import { useTheme } from '../theme/ThemeContext';
import { formatDate, formatMoneyValue, parseMoneyInput, toDateInputValue } from '../utils/formatters';
import { Chip, DatePickerField, MoneyInput } from './ui';

export default function TransactionPreviewCard({
  transaction,
  categories = [],
  onConfirm,
  onCancel,
  onEdit,
  busy = false,
  resolved = false,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(formatMoneyValue(transaction.amount));
  const [description, setDescription] = useState(transaction.description || '');
  const [transactionDate, setTransactionDate] = useState(toDateInputValue(transaction.transaction_date));
  const [categoryId, setCategoryId] = useState(transaction.category_id || null);

  useEffect(() => {
    setAmount(formatMoneyValue(transaction.amount));
    setDescription(transaction.description || '');
    setTransactionDate(toDateInputValue(transaction.transaction_date));
    setCategoryId(transaction.category_id || null);
  }, [transaction.amount, transaction.category_id, transaction.description, transaction.transaction_date]);

  async function saveEdit() {
    const parsedAmount = parseMoneyInput(amount);
    if (!description.trim() || !(parsedAmount > 0) || !categoryId || !transactionDate) return;
    const updated = await onEdit?.({
      description: description.trim(),
      amount: parsedAmount,
      category_id: categoryId,
      transaction_date: transactionDate,
    });
    if (updated !== false) setEditing(false);
  }

  const signed = transaction.type === 'income' ? Number(transaction.amount) : -Number(transaction.amount);
  const isIncome = transaction.type === 'income';

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <AppIcon name="receipt-long" size={16} color={c.brand} />
          </View>
          <Text style={styles.heading}>Xác nhận giao dịch</Text>
          <View style={[styles.typeBadge, { backgroundColor: isIncome ? c.incomeSoft : c.expenseSoft }]}>
            <Text style={[styles.typeBadgeText, { color: isIncome ? c.income : c.expense }]}>
              {isIncome ? 'Thu nhập' : 'Chi tiêu'}
            </Text>
          </View>
        </View>

        {editing ? (
          <View style={styles.editSection}>
            <Text style={styles.fieldLabel}>Mô tả</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả giao dịch"
              placeholderTextColor={c.textMuted}
            />
            <Text style={styles.fieldLabel}>Số tiền (VND)</Text>
            <MoneyInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="Nhập số tiền"
              placeholderTextColor={c.textMuted}
            />
            <Text style={styles.fieldLabel}>Ngày giao dịch</Text>
            <DatePickerField
              accessibilityLabel="Chọn ngày giao dịch"
              clearable={false}
              maximumDate={new Date()}
              onChange={setTransactionDate}
              style={styles.fieldControl}
              value={transactionDate}
            />
            <Text style={styles.fieldLabel}>Danh mục</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {categories
                .filter((category) => category.type === transaction.type)
                .map((category) => (
                  <Chip
                    key={category.id}
                    active={Number(categoryId) === Number(category.id)}
                    label={category.name}
                    onPress={() => setCategoryId(category.id)}
                  />
                ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={saveEdit}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator size="small" color={c.onBrand} />
                : <AppIcon name="check-circle" size={16} color={c.onBrand} />}
              <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.detailSection}>
            <Text style={styles.desc}>{transaction.category_icon} {transaction.description}</Text>
            <BalanceDisplay amount={signed} showSign size={26} style={{ marginBottom: 10 }} />
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{transaction.category_name}</Text>
              </View>
              <Text style={styles.metaDate}>{formatDate(transaction.transaction_date)}</Text>
            </View>
          </View>
        )}

        {!editing && !resolved && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} disabled={busy}>
              {busy
                ? <ActivityIndicator size="small" color={c.onBrand} />
                : <AppIcon name="check" size={16} color={c.onBrand} />}
              <Text style={styles.confirmText}>Xác nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} disabled={busy}>
              <AppIcon name="edit" size={16} color={c.brand} />
              <Text style={styles.editText}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={busy}>
              <AppIcon name="close" size={16} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        {resolved && (
          <View style={styles.resolvedBar}>
            <AppIcon name="check-circle" size={16} color={c.income} />
            <Text style={styles.resolvedText}>Đã xử lý bản xem trước này</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (t) => StyleSheet.create({
  wrapper: { alignSelf: 'flex-start', width: '90%', marginBottom: 12 },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    overflow: 'hidden',
    ...t.shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    backgroundColor: t.colors.surfaceAlt,
  },
  headerIcon: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  heading: { flex: 1, fontWeight: '800', color: t.colors.text, fontSize: 14 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: t.radius.pill },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  detailSection: { padding: 16 },
  desc: { fontSize: 16, fontWeight: '700', color: t.colors.text, marginBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  metaChip: { backgroundColor: t.colors.brandSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.pill },
  metaChipText: { color: t.colors.brandText, fontSize: 12, fontWeight: '700' },
  metaDate: { color: t.colors.textMuted, fontSize: 12, fontWeight: '600' },

  editSection: { padding: 16 },
  fieldLabel: { color: t.colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md,
    padding: 12, marginBottom: 12, fontSize: 15, color: t.colors.text, backgroundColor: t.colors.surfaceAlt,
  },
  fieldControl: { marginBottom: 12 },
  categoryList: { gap: 7, paddingBottom: 12 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: t.colors.brand, padding: 13, borderRadius: t.radius.md, ...t.shadows.sm,
  },
  saveBtnText: { color: t.colors.onBrand, fontWeight: '800', fontSize: 14 },

  actions: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderTopWidth: 1, borderTopColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: t.colors.brand, paddingVertical: 11, borderRadius: t.radius.md, ...t.shadows.sm,
  },
  confirmText: { color: t.colors.onBrand, fontWeight: '800', fontSize: 14 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: t.radius.md,
    borderWidth: 1.5, borderColor: t.colors.brand, backgroundColor: t.colors.brandSoft,
  },
  editText: { color: t.colors.brandText, fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    width: 42, alignItems: 'center', justifyContent: 'center', borderRadius: t.radius.md,
    borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  resolvedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderTopWidth: 1, borderTopColor: t.colors.border, backgroundColor: t.colors.incomeSoft,
  },
  resolvedText: { color: t.colors.income, fontSize: 12, fontWeight: '800' },
});
