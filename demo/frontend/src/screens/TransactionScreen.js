import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { api } from '../services/api.service';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';
import { formatVND, formatDate } from '../utils/formatters';
import TransactionCard from '../components/TransactionCard';
import AppIcon from '../components/AppIcon';

const FILTERS = [
  { key: null,      label: 'Tất cả', icon: 'apps' },
  { key: 'expense', label: 'Chi tiêu', icon: 'trending-down' },
  { key: 'income',  label: 'Thu nhập', icon: 'trending-up' },
];

function SkeletonRow() {
  return (
    <View style={{ backgroundColor: COLORS.surface, padding: 14, borderRadius: RADIUS.md, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.borderLight }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ width: '60%', height: 14, backgroundColor: COLORS.borderLight, borderRadius: 4 }} />
          <View style={{ width: '40%', height: 10, backgroundColor: COLORS.borderLight, borderRadius: 4 }} />
        </View>
        <View style={{ width: 60, height: 14, backgroundColor: COLORS.borderLight, borderRadius: 4 }} />
      </View>
    </View>
  );
}

export default function TransactionScreen() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState(null);
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
          try { await api.deleteTransaction(id); await load(); }
          catch (err) { Alert.alert('Lỗi', err.message); }
        },
      },
    ]);
  }

  const expenseCategories = categories.filter((c) => c.type === form.type);

  const renderItem = ({ item }) => (
    <TransactionCard transaction={item} onLongPress={() => deleteTransaction(item.id)} />
  );

  const ListHeader = (
    <View>
      {/* Add button */}
      <TouchableOpacity
        style={[styles.addToggle, showForm && styles.addToggleActive]}
        onPress={() => setShowForm((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={[styles.addIcon, showForm && styles.addIconActive]}>
          <AppIcon name={showForm ? 'close' : 'add'} size={18} color={showForm ? COLORS.expense : '#fff'} />
        </View>
        <Text style={[styles.addToggleText, showForm && styles.addToggleTextActive]}>
          {showForm ? 'Đóng form' : 'Thêm giao dịch mới'}
        </Text>
        {!showForm && <AppIcon name="chevron-right" size={18} color="rgba(255,255,255,0.7)" />}
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          {/* Type selector */}
          <View style={styles.segment}>
            {[['expense', 'Chi tiêu', 'trending-down'], ['income', 'Thu nhập', 'trending-up']].map(([type, label, icon]) => (
              <TouchableOpacity
                key={type}
                style={[styles.segmentButton, form.type === type && (type === 'expense' ? styles.segmentExpense : styles.segmentIncome)]}
                onPress={() => {
                  const defCat = categories.find((c) => c.type === type);
                  setForm((prev) => ({ ...prev, type, category_id: defCat?.id || null }));
                }}
              >
                <AppIcon name={icon} size={16} color={
                  form.type === type ? '#fff' : COLORS.muted
                } />
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
          <View style={styles.amountWrapper}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Số tiền (VND)"
              placeholderTextColor={COLORS.muted}
              value={form.amount}
              keyboardType="numeric"
              onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))}
            />
            {form.amount.length > 0 && (
              <View style={styles.amountPreviewPill}>
                <Text style={styles.amountPreviewText}>{formatVND(Number(form.amount))}</Text>
              </View>
            )}
          </View>

          <Text style={styles.inputLabel}>Danh mục</Text>
          <FlatList
            data={expenseCategories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.catChip, form.category_id === item.id && styles.catChipActive]}
                onPress={() => setForm((p) => ({ ...p, category_id: item.id }))}
              >
                <Text style={styles.catChipIcon}>{item.icon}</Text>
                <Text style={[styles.catChipText, form.category_id === item.id && styles.catChipTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
          />

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={add} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <>
                  <AppIcon name="check-circle" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Lưu giao dịch</Text>
                </>
              )}
          </TouchableOpacity>
        </View>
      )}

      {/* Filter row */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.key)}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <AppIcon name={f.icon} size={14} color={filter === f.key ? '#fff' : COLORS.muted} />
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <AppIcon name="search" size={18} color={COLORS.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm giao dịch..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <AppIcon name="close" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

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
          <Text style={styles.emptyMsg}>Hãy thêm giao dịch đầu tiên!</Text>
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
  content: { padding: 16, paddingBottom: 32 },

  // ── Add toggle ───────────────────────────────────────────────────────────────
  addToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  addToggleActive: { backgroundColor: COLORS.expenseLight, borderWidth: 1.5, borderColor: COLORS.expense, ...SHADOWS.sm, shadowColor: COLORS.expense },
  addIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  addIconActive: { backgroundColor: 'rgba(244,63,94,0.1)' },
  addToggleText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 14 },
  addToggleTextActive: { color: COLORS.expense },

  // ── Form ─────────────────────────────────────────────────────────────────────
  form: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  segment: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  segmentButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: RADIUS.md,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
  },
  segmentExpense: { backgroundColor: COLORS.expense, borderColor: COLORS.expense },
  segmentIncome: { backgroundColor: COLORS.income, borderColor: COLORS.income },
  segmentText: { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  segmentActiveText: { color: '#fff' },

  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 13,
    marginBottom: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  amountWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  amountPreviewPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  amountPreviewText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },

  inputLabel: { color: COLORS.muted, fontWeight: '700', marginBottom: 8, fontSize: 13 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipIcon: { fontSize: 14 },
  catChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // ── Filter ───────────────────────────────────────────────────────────────────
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.muted, fontWeight: '700' },
  filterTextActive: { color: '#fff', fontWeight: '800' },

  // ── Search ───────────────────────────────────────────────────────────────────
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  resultCount: { color: COLORS.muted, fontSize: 12, fontWeight: '600', marginBottom: 10 },

  // ── Empty ────────────────────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyMsg: { color: COLORS.muted, textAlign: 'center' },
});
