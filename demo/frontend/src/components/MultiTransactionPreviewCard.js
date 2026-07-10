import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatVND } from '../utils/formatters';
import AppIcon from './AppIcon';

export default function MultiTransactionPreviewCard({
  transactions = [],
  onConfirm,
  onCancel,
  onEdit,
  busy = false,
  resolved = false,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;
  const [editingIndex, setEditingIndex] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingIndex === null) return;
    const item = transactions[editingIndex];
    if (!item) {
      setEditingIndex(null);
      setDraft(null);
      return;
    }
    setDraft({
      description: item.description || '',
      amount: String(item.amount || ''),
      type: item.type === 'income' ? 'income' : 'expense',
    });
  }, [transactions, editingIndex]);

  function beginEdit(index) {
    const item = transactions[index];
    setEditingIndex(index);
    setDraft({
      description: item.description || '',
      amount: String(item.amount || ''),
      type: item.type === 'income' ? 'income' : 'expense',
    });
  }

  async function saveEdit() {
    if (!draft?.description.trim() || !(Number(draft.amount) > 0)) return;
    setSaving(true);
    try {
      const updated = await onEdit?.(editingIndex, {
        description: draft.description.trim(),
        amount: Number(draft.amount),
        type: draft.type,
      });
      if (updated !== false) {
        setEditingIndex(null);
        setDraft(null);
      }
    } finally {
      setSaving(false);
    }
  }

  const expenseTotal = transactions
    .filter((item) => item.type !== 'income')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const incomeTotal = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <AppIcon name="playlist-add-check" size={18} color={c.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Xác nhận nhiều giao dịch</Text>
            <Text style={styles.subheading}>{transactions.length} khoản được nhận diện</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{transactions.length}</Text>
          </View>
        </View>

        <View style={styles.list}>
          {transactions.map((transaction, index) => {
            const income = transaction.type === 'income';
            const editing = editingIndex === index && draft;
            return (
              <View key={`${index}-${transaction.description}`} style={[styles.row, index > 0 && styles.rowBorder]}>
                {editing ? (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Mô tả</Text>
                    <TextInput
                      style={styles.input}
                      value={draft.description}
                      onChangeText={(description) => setDraft((prev) => ({ ...prev, description }))}
                      placeholder="Mô tả giao dịch"
                      placeholderTextColor={c.textMuted}
                    />
                    <Text style={styles.fieldLabel}>Số tiền (VND)</Text>
                    <TextInput
                      style={styles.input}
                      value={draft.amount}
                      onChangeText={(amount) => setDraft((prev) => ({ ...prev, amount }))}
                      keyboardType="numeric"
                      placeholder="Số tiền"
                      placeholderTextColor={c.textMuted}
                    />
                    <View style={styles.typeRow}>
                      {[
                        { value: 'expense', label: 'Chi tiêu' },
                        { value: 'income', label: 'Thu nhập' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.typeChip, draft.type === option.value && styles.typeChipActive]}
                          onPress={() => setDraft((prev) => ({ ...prev, type: option.value }))}
                        >
                          <Text style={[styles.typeChipText, draft.type === option.value && styles.typeChipTextActive]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.editActions}>
                      <TouchableOpacity style={styles.saveButton} onPress={saveEdit} disabled={saving}>
                        {saving
                          ? <ActivityIndicator size="small" color={c.onBrand} />
                          : <AppIcon name="check" size={16} color={c.onBrand} />}
                        <Text style={styles.saveText}>Lưu</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.closeEditButton}
                        onPress={() => { setEditingIndex(null); setDraft(null); }}
                        disabled={saving}
                      >
                        <Text style={styles.closeEditText}>Bỏ qua</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={[styles.typeIcon, { backgroundColor: income ? c.incomeSoft : c.expenseSoft }]}>
                      <AppIcon name={income ? 'south-west' : 'north-east'} size={14} color={income ? c.income : c.expense} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.description} numberOfLines={2}>
                        {transaction.category_icon ? `${transaction.category_icon} ` : ''}{transaction.description}
                      </Text>
                      <Text style={styles.category}>{transaction.category_name || 'Chưa phân loại'}</Text>
                    </View>
                    <View style={styles.amountColumn}>
                      <Text style={[styles.amount, { color: income ? c.income : c.expense }]}>
                        {income ? '+' : '-'}{formatVND(transaction.amount)}
                      </Text>
                      {!resolved && (
                        <TouchableOpacity style={styles.editIcon} onPress={() => beginEdit(index)} disabled={busy}>
                          <AppIcon name="edit" size={14} color={c.brandText} />
                          <Text style={styles.editLabel}>Sửa</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.totalRow}>
          {expenseTotal > 0 && <Text style={styles.totalExpense}>Chi {formatVND(expenseTotal)}</Text>}
          {incomeTotal > 0 && <Text style={styles.totalIncome}>Thu {formatVND(incomeTotal)}</Text>}
        </View>

        {resolved ? (
          <View style={styles.resolvedBar}>
            <AppIcon name="check-circle" size={16} color={c.income} />
            <Text style={styles.resolvedText}>Đã xử lý bản xem trước này</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} disabled={busy || editingIndex !== null}>
              {busy
                ? <ActivityIndicator size="small" color={c.onBrand} />
                : <AppIcon name="done-all" size={17} color={c.onBrand} />}
              <Text style={styles.confirmText}>Xác nhận tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={busy}>
              <AppIcon name="close" size={17} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (t) => StyleSheet.create({
  wrapper: { alignSelf: 'flex-start', width: '96%', marginBottom: 12 },
  card: {
    backgroundColor: t.colors.surface, borderRadius: t.radius.xl,
    borderWidth: 1.5, borderColor: t.colors.border, overflow: 'hidden', ...t.shadows.md,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14,
    borderBottomWidth: 1, borderBottomColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  headerIcon: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: t.colors.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  heading: { color: t.colors.text, fontSize: 14, fontWeight: '800' },
  subheading: { color: t.colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  countBadge: {
    minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 7,
    alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.brand,
  },
  countText: { color: t.colors.onBrand, fontWeight: '900', fontSize: 12 },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: t.colors.border },
  typeIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  description: { color: t.colors.text, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  category: { color: t.colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  amountColumn: { alignItems: 'flex-end', maxWidth: '38%' },
  amount: { fontSize: 12, fontWeight: '900' },
  editIcon: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 5, paddingLeft: 8 },
  editLabel: { color: t.colors.brandText, fontSize: 10, fontWeight: '700' },
  fieldLabel: { color: t.colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 5 },
  input: {
    borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.sm,
    paddingHorizontal: 11, paddingVertical: 9, marginBottom: 9,
    color: t.colors.text, backgroundColor: t.colors.surfaceAlt, fontSize: 13,
  },
  typeRow: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  typeChip: {
    flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: t.radius.sm,
    borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  typeChipActive: { backgroundColor: t.colors.brandSoft, borderColor: t.colors.brand },
  typeChipText: { color: t.colors.textMuted, fontSize: 11, fontWeight: '700' },
  typeChipTextActive: { color: t.colors.brandText },
  editActions: { flexDirection: 'row', gap: 8 },
  saveButton: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5,
    backgroundColor: t.colors.brand, paddingVertical: 9, borderRadius: t.radius.sm,
  },
  saveText: { color: t.colors.onBrand, fontSize: 12, fontWeight: '800' },
  closeEditButton: {
    justifyContent: 'center', paddingHorizontal: 13, borderRadius: t.radius.sm,
    borderWidth: 1, borderColor: t.colors.border,
  },
  closeEditText: { color: t.colors.textMuted, fontSize: 12, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  totalExpense: { color: t.colors.expense, fontSize: 12, fontWeight: '800' },
  totalIncome: { color: t.colors.income, fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: t.colors.border },
  confirmButton: {
    flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: t.colors.brand, borderRadius: t.radius.md,
  },
  confirmText: { color: t.colors.onBrand, fontSize: 13, fontWeight: '800' },
  cancelButton: {
    width: 42, alignItems: 'center', justifyContent: 'center', borderRadius: t.radius.md,
    borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  resolvedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderTopWidth: 1, borderTopColor: t.colors.border, backgroundColor: t.colors.incomeSoft,
  },
  resolvedText: { color: t.colors.income, fontSize: 12, fontWeight: '800' },
});
