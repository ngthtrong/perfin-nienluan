import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import BalanceDisplay from './BalanceDisplay';
import { COLORS } from '../utils/constants';
import { formatDate } from '../utils/formatters';

export default function TransactionPreviewCard({ transaction, onConfirm, onCancel, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(transaction.amount || ''));
  const [description, setDescription] = useState(transaction.description || '');

  const signed = transaction.type === 'income' ? Number(transaction.amount) : -Number(transaction.amount);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Xác nhận giao dịch</Text>
      {editing ? (
        <>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Mô tả" />
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Số tiền" />
          <TouchableOpacity style={styles.primary} onPress={() => { onEdit({ description, amount: Number(amount) }); setEditing(false); }}>
            <Text style={styles.primaryText}>Lưu thay đổi</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.desc}>{transaction.category_icon} {transaction.description}</Text>
          <BalanceDisplay amount={signed} showSign size={24} />
          <Text style={styles.meta}>{transaction.category_name} · {formatDate(transaction.transaction_date)}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.confirm} onPress={onConfirm}><Text style={styles.actionText}>Xác nhận</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => setEditing(true)}><Text>Sửa</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={onCancel}><Text>Hủy</Text></TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'flex-start', width: '92%', backgroundColor: COLORS.surface, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  heading: { fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  desc: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  meta: { color: COLORS.muted, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  confirm: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
  secondary: { backgroundColor: '#EEF2F7', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
  actionText: { color: '#fff', fontWeight: '700' },
  primary: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 8 },
});
