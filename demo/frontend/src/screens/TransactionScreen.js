import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { formatVND } from '../utils/formatters';
import TransactionCard from '../components/TransactionCard';
import CategoryIcon from '../components/CategoryIcon';
import AppIcon from '../components/AppIcon';
import { Button, Chip, EmptyState, Skeleton } from '../components/ui';

const FILTERS = [
  { key: null, label: 'Tất cả', icon: 'apps' },
  { key: 'expense', label: 'Chi tiêu', icon: 'trending-down' },
  { key: 'income', label: 'Thu nhập', icon: 'trending-up' },
];

export default function TransactionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ description: '', amount: '', type: 'expense', category_id: null });
  const [showForm, setShowForm] = useState(false);

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
        const defaultCat = cats.data.find((x) => x.type === form.type) || cats.data[0];
        setForm((prev) => ({ ...prev, category_id: defaultCat?.id || null }));
      }
    } catch (_) {
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
      const defaultCat = categories.find((x) => x.type === form.type) || categories[0];
      setForm({ description: '', amount: '', type: 'expense', category_id: defaultCat?.id || null });
      setShowForm(false);
      await load();
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setSaving(false);
    }
  }

  function deleteTransaction(id) {
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

  const formCategories = categories.filter((x) => x.type === form.type);

  const ListHeader = (
    <View>
      <Button
        label={showForm ? 'Đóng form' : 'Thêm giao dịch mới'}
        icon={showForm ? 'close' : 'add'}
        variant={showForm ? 'secondary' : 'primary'}
        onPress={() => setShowForm((v) => !v)}
        style={{ marginBottom: 12 }}
      />

      {showForm && (
        <View style={styles.form}>
          <View style={styles.segment}>
            {[['expense', 'Chi tiêu', 'trending-down', c.expense], ['income', 'Thu nhập', 'trending-up', c.income]].map(([type, label, icon, color]) => {
              const active = form.type === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.segmentButton, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => {
                    const defCat = categories.find((x) => x.type === type);
                    setForm((prev) => ({ ...prev, type, category_id: defCat?.id || null }));
                  }}
                >
                  <AppIcon name={icon} size={16} color={active ? '#fff' : c.textMuted} />
                  <Text style={[styles.segmentText, active && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Mô tả giao dịch..."
            placeholderTextColor={c.textMuted}
            value={form.description}
            onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
          />
          <View style={styles.amountWrapper}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Số tiền (VND)"
              placeholderTextColor={c.textMuted}
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
            data={formCategories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(x) => String(x.id)}
            renderItem={({ item }) => (
              <Chip
                label={item.name}
                active={form.category_id === item.id}
                onPress={() => setForm((p) => ({ ...p, category_id: item.id }))}
                style={{ marginRight: 8 }}
              />
            )}
            contentContainerStyle={{ paddingBottom: 14 }}
          />

          <Button label="Lưu giao dịch" icon="check-circle" onPress={add} loading={saving} />
        </View>
      )}

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Chip key={String(f.key)} label={f.label} icon={f.icon} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>

      <View style={styles.searchWrapper}>
        <AppIcon name="search" size={18} color={c.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm giao dịch..."
          placeholderTextColor={c.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <AppIcon name="close" size={16} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.resultCount}>{transactions.length} giao dịch</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { padding: 16, gap: 8 }]}>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={66} radius={14} />)}
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={transactions}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <TransactionCard transaction={item} onLongPress={() => deleteTransaction(item.id)} />}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={<EmptyState emoji="📭" title="Chưa có giao dịch nào" message="Hãy thêm giao dịch đầu tiên!" />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

const createStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.bg },
  content: { padding: 16, paddingBottom: 32 },

  form: {
    backgroundColor: t.colors.surface, padding: 16, borderRadius: t.radius.lg,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: 14, ...t.shadows.sm,
  },
  segment: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  segmentButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceAlt, borderWidth: 1.5, borderColor: t.colors.border,
  },
  segmentText: { fontSize: 14, fontWeight: '700', color: t.colors.textMuted },

  input: {
    borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md,
    padding: 13, marginBottom: 12, fontSize: 15, color: t.colors.text, backgroundColor: t.colors.surfaceAlt,
  },
  amountWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  amountPreviewPill: { backgroundColor: t.colors.brandSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: t.radius.pill },
  amountPreviewText: { color: t.colors.brandText, fontWeight: '800', fontSize: 13 },
  inputLabel: { color: t.colors.textMuted, fontWeight: '700', marginBottom: 8, fontSize: 13 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: t.colors.surface, borderWidth: 1.5, borderColor: t.colors.border,
    borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: t.colors.text },
  resultCount: { color: t.colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 10 },
});
