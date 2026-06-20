import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { api } from '../services/api.service';
import { COLORS } from '../utils/constants';
import TransactionCard from '../components/TransactionCard';

export default function TransactionScreen() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ description: '', amount: '', type: 'expense' });
  const selectedCategory = categories.find((cat) => cat.type === form.type);

  async function load() {
    const [tx, cats] = await Promise.all([api.getTransactions('?limit=50'), api.getCategories()]);
    setTransactions(tx.data);
    setCategories(cats.data);
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function add() {
    if (!form.description || !form.amount || !selectedCategory) return;
    await api.createTransaction({ ...form, amount: Number(form.amount), category_id: selectedCategory.id });
    setForm({ description: '', amount: '', type: 'expense' });
    await load();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Thêm giao dịch thủ công</Text>
      <View style={styles.form}>
        <View style={styles.segment}>
          {['expense', 'income'].map((type) => (
            <TouchableOpacity key={type} style={[styles.segmentButton, form.type === type && styles.segmentActive]} onPress={() => setForm({ ...form, type })}>
              <Text style={form.type === type ? styles.segmentActiveText : null}>{type === 'expense' ? 'Chi' : 'Thu'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Mô tả" value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
        <TextInput style={styles.input} placeholder="Số tiền" value={form.amount} keyboardType="numeric" onChangeText={(amount) => setForm({ ...form, amount })} />
        <Text style={styles.meta}>Danh mục mặc định: {selectedCategory?.icon} {selectedCategory?.name}</Text>
        <TouchableOpacity style={styles.primary} onPress={add}><Text style={styles.primaryText}>Lưu giao dịch</Text></TouchableOpacity>
      </View>
      <Text style={styles.title}>Lịch sử giao dịch</Text>
      {transactions.map((tx) => <TransactionCard key={tx.id} transaction={tx} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  form: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginTop: 8 },
  primary: { backgroundColor: COLORS.primary, padding: 12, alignItems: 'center', borderRadius: 8, marginTop: 10 },
  primaryText: { color: '#fff', fontWeight: '700' },
  meta: { color: COLORS.muted, marginTop: 8 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentButton: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: COLORS.background },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentActiveText: { color: '#fff', fontWeight: '700' },
});
