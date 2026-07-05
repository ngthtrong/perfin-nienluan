import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import BalanceDisplay from './BalanceDisplay';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';
import { formatDate } from '../utils/formatters';
import AppIcon from './AppIcon';

export default function TransactionPreviewCard({ transaction, onConfirm, onCancel, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(transaction.amount || ''));
  const [description, setDescription] = useState(transaction.description || '');

  const signed = transaction.type === 'income' ? Number(transaction.amount) : -Number(transaction.amount);
  const isIncome = transaction.type === 'income';

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <AppIcon name="receipt-long" size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.heading}>Xác nhận giao dịch</Text>
          <View style={[styles.typeBadge, isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense]}>
            <Text style={[styles.typeBadgeText, { color: isIncome ? COLORS.income : COLORS.expense }]}>
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
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.fieldLabel}>Số tiền (VND)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Nhập số tiền"
              placeholderTextColor={COLORS.muted}
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => { onEdit({ description, amount: Number(amount) }); setEditing(false); }}
            >
              <AppIcon name="check-circle" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.detailSection}>
            <Text style={styles.desc}>
              {transaction.category_icon} {transaction.description}
            </Text>
            <BalanceDisplay amount={signed} showSign size={26} style={styles.amount} />
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{transaction.category_name}</Text>
              </View>
              <Text style={styles.metaDate}>{formatDate(transaction.transaction_date)}</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {!editing && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <AppIcon name="check" size={16} color="#fff" />
              <Text style={styles.confirmText}>Xác nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <AppIcon name="edit" size={16} color={COLORS.primary} />
              <Text style={styles.editText}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <AppIcon name="close" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'flex-start', width: '90%', marginBottom: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { flex: 1, fontWeight: '800', color: COLORS.text, fontSize: 14 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  typeBadgeIncome: { backgroundColor: COLORS.incomeLight },
  typeBadgeExpense: { backgroundColor: COLORS.expenseLight },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  // Detail
  detailSection: { padding: 16 },
  desc: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  amount: { marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  metaChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  metaDate: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },

  // Edit
  editSection: { padding: 16 },
  fieldLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    padding: 13,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  editBtn: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  editText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
});
