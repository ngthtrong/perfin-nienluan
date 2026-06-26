import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { api } from '../services/api.service';
import { COLORS } from '../utils/constants';
import { formatVND, formatDate } from '../utils/formatters';
import TransactionCard from '../components/TransactionCard';

const FILTERS = [
  { key: null,      label: 'Tất cả' },
  { key: 'expense', label: 'Chi tiêu' },
  { key: 'income',  label: 'Thu nhập' },
];

function SkeletonRow() {
  return (
    <View style={{ backgroundColor: COLORS.surface, padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: '55%', height: 14, backgroundColor: '#E5E7EB', borderRadius: 4 }} />
        <View style={{ width: '25%', height: 14, backgroundColor: '#E5E7EB', borderRadius: 4 }} />
      </View>
      <View style={{ width: '35%', height: 10, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: 8 }} />
    </View>
  );
}

export default function TransactionScreen() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState(null); // null = all
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ description: '', amount: '', type: 'expense', category_id: null });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filter) params.set('type', filter);
      if (search.trim()) params.set('search', search.trim());
      const [tx, cats] = await Promise.all([
        api.getTransactions('?' + params.toString()),
        api.getCategories(),
      ]);
      setTransactions(tx.data || []);
      setCategories(cats.data || []);
      if (!form.category_id && cats.data?.length) {
        const defaultCat = cats.data.find((c) => c.type === form.type) || cats.data[0];
        setForm((prev) => ({ ...prev, category_id: defaultCat?.id || null }));
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function add() {
    if (!form.description.trim() || !form.amount || !form.category_id) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ mô tả, số tiền và chọn danh mục.');
      return;
    }
    setSaving(true);
    try {
      await api.createTransaction({
        description: form.description.trim(),
        amount: Number(form.amount),
        type: form.type,
        category_id: form.category_id,
      });
      const defaultCat = categories.find((c) => c.type === form.type) || categories[0];
      setForm({ description: '', amount: '', type: 'expense', category_id: defaultCat?.id || null });
      setShowForm(false);
      await load();
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(id) {
    Alert.alert('Xoá giao dịch', 'Bạn có muốn xoá giao dịch này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive', onPress: async () => {
          try {
            await api.deleteTransaction(id);
            await load();
          } catch (err) {
            Alert.alert('Lỗi', err.message);
          }
        },
      },
    ]);
  }

  const expenseCategories = categories.filter((c) => c.type === form.type);

  const renderItem = ({ item }) => (
    <TransactionCard
      transaction={item}
      onLongPress={() => deleteTransaction(item.id)}
    />
  );

  const ListHeader = (
    <View>
      {/* Add form toggle */}
      <TouchableOpacity
        style={[styles.toggleForm, showForm && styles.toggleFormActive]}
        onPress={() => setShowForm((v) => !v)}
      >
        <Text style={[styles.toggleFormText, showForm && styles.toggleFormTextActive]}>
          {showForm ? '✕ Đóng form' : '＋ Thêm giao dịch thủ công'}
        </Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          {/* Type selector */}
          <View style={styles.segment}>
            {[['expense', '📉 Chi tiêu'], ['income', '📈 Thu nhập']].map(([type, label]) => (
              <TouchableOpacity
                key={type}
                style={[styles.segmentButton, form.type === type && styles.segmentActive]}
                onPress={() => {
                  const defCat = categories.find((c) => c.type === type);
                  setForm((prev) => ({ ...prev, type, category_id: defCat?.id || null }));
                }}
              >
                <Text style={[styles.segmentText, form.type === type && styles.segmentActiveText]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Mô tả giao dịch..."
            placeholderTextColor={COLORS.muted}
            value={form.description}
            onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Số tiền (VND)"
            placeholderTextColor={COLORS.muted}
            value={form.amount}
            keyboardType="numeric"
            onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))}
          />

          {/* Category chips */}
          <Text style={styles.inputLabel}>Danh mục</Text>
          <FlatList
            data={expenseCategories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.chip, form.category_id === item.id && styles.chipActive]}
                onPress={() => setForm((p) => ({ ...p, category_id: item.id }))}
              >
                <Text style={[styles.chipText, form.category_id === item.id && styles.chipActiveText]}>
                  {item.icon} {item.name}
                </Text>
              </TouchableOpacity>
            )}
            style={{ marginBottom: 12 }}
          />

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={add} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>💾 Lưu giao dịch</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Filter & search */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.key)}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Tìm kiếm giao dịch..."
        placeholderTextColor={COLORS.muted}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
      />
      <Text style={styles.resultCount}>{transactions.length} giao dịch</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 16 }}>
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={transactions}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Chưa có giao dịch nào</Text>
          <Text style={styles.emptyMsg}>Hãy nhắn cho PERFIN khoản thu chi đầu tiên!</Text>
        </View>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 24 },

  toggleForm: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12,
    alignItems: 'center', backgroundColor: COLORS.surface, marginBottom: 12,
  },
  toggleFormActive: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  toggleFormText: { color: COLORS.muted, fontWeight: '700' },
  toggleFormTextActive: { color: COLORS.primary },

  form: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  segment: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  segmentActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segmentText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  segmentActiveText: { color: '#fff' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.background },
  inputLabel: { color: COLORS.muted, fontWeight: '700', marginBottom: 6, fontSize: 13 },
  chip: { backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text },
  chipActiveText: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  filterTextActive: { color: '#fff', fontWeight: '800' },
  searchInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 10, color: COLORS.text, backgroundColor: COLORS.surface },
  resultCount: { color: COLORS.muted, fontSize: 12, marginBottom: 8 },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyMsg: { color: COLORS.muted, textAlign: 'center' },
});
