import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { api } from '../services/api.service';
import { COLORS } from '../utils/constants';
import { currentPeriod, formatVND } from '../utils/formatters';
import BudgetProgressBar from '../components/BudgetProgressBar';

export default function BudgetScreen() {
  const period = currentPeriod();
  const [progress, setProgress] = useState([]);
  const [categories, setCategories] = useState([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(null);

  async function load() {
    const [items, cats] = await Promise.all([api.getBudgetProgress(period.month, period.year), api.getCategories('expense')]);
    setProgress(items.data);
    setCategories(cats.data);
    setCategoryId((prev) => prev || cats.data[0]?.id);
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function add() {
    if (!categoryId || !amount) return;
    await api.createBudget({ category_id: categoryId, amount_limit: Number(amount), month: period.month, year: period.year });
    setAmount('');
    await load();
  }

  const totalBudget = progress.reduce((sum, item) => sum + Number(item.amount_limit), 0);
  const totalSpent = progress.reduce((sum, item) => sum + Number(item.spent), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.period}>Tháng {period.month}, {period.year}</Text>
      <Text style={styles.overview}>Tổng ngân sách: {formatVND(totalBudget)} · Đã chi: {formatVND(totalSpent)}</Text>
      <View style={styles.form}>
        <Text style={styles.title}>Thêm ngân sách</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
          {categories.map((cat) => (
            <TouchableOpacity key={cat.id} style={[styles.chip, categoryId === cat.id && styles.chipActive]} onPress={() => setCategoryId(cat.id)}>
              <Text style={categoryId === cat.id ? styles.chipActiveText : null}>{cat.icon} {cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Nhập mức ngân sách" />
        <TouchableOpacity style={styles.primary} onPress={add}><Text style={styles.primaryText}>Tạo ngân sách</Text></TouchableOpacity>
      </View>
      {progress.length ? progress.map((item) => (
        <View key={item.budget_id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.category_icon} {item.category_name}</Text>
          <BudgetProgressBar percentage={item.percentage} spent={item.spent} limit={item.amount_limit} status={item.status} />
          <Text style={styles.meta}>Còn lại: {formatVND(item.remaining)}</Text>
        </View>
      )) : <Text style={styles.empty}>Chưa có ngân sách nào.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  period: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  overview: { color: COLORS.muted, marginVertical: 8 },
  title: { fontWeight: '800', color: COLORS.text },
  form: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  chip: { backgroundColor: COLORS.background, padding: 9, borderRadius: 8, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary },
  chipActiveText: { color: '#fff', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10 },
  primary: { backgroundColor: COLORS.primary, padding: 12, alignItems: 'center', borderRadius: 8, marginTop: 10 },
  primaryText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  cardTitle: { fontWeight: '800', fontSize: 16 },
  meta: { color: COLORS.muted, marginTop: 6 },
  empty: { color: COLORS.muted },
});
