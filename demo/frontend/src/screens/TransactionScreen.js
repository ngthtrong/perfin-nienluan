import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ScrollView,
} from 'react-native';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { formatVND } from '../utils/formatters';
import { showAlert } from '../utils/alerts';
import TransactionCard from '../components/TransactionCard';
import AppIcon from '../components/AppIcon';
import { Button, Chip, EmptyState, ErrorState, Skeleton } from '../components/ui';

const FILTERS = [
  { key: null, label: 'Tất cả', icon: 'apps' },
  { key: 'expense', label: 'Chi tiêu', icon: 'trending-down' },
  { key: 'income', label: 'Thu nhập', icon: 'trending-up' },
];

const EMPTY_FORM = {
  description: '',
  amount: '',
  type: 'expense',
  category_id: null,
  wallet_id: null,
  transaction_date: '',
  note: '',
};

export default function TransactionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [categoryEditingId, setCategoryEditingId] = useState(null);
  const [categorySavingId, setCategorySavingId] = useState(null);
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filter) params.set('type', filter);
      if (search.trim()) params.set('search', search.trim());
      const [tx, cats, walletResponse] = await Promise.all([
        api.getTransactions('?' + params.toString()),
        api.getCategories(),
        api.getWallets(),
      ]);
      const nextCategories = cats.data || [];
      const nextWallets = walletResponse.data || [];
      setTransactions(tx.data || []);
      setCategories(nextCategories);
      setWallets(nextWallets);
      setError(null);
      setForm((previous) => {
        const defaultCategory = nextCategories.find((item) => item.type === previous.type);
        const defaultWallet = nextWallets.find((item) => item.is_default) || nextWallets[0];
        return {
          ...previous,
          category_id: previous.category_id || defaultCategory?.id || null,
          wallet_id: previous.wallet_id || defaultWallet?.id || null,
        };
      });
    } catch (err) {
      setError(err.message || 'Không thể tải giao dịch.');
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

  function resetForm({ close = true } = {}) {
    const defaultCategory = categories.find((item) => item.type === 'expense');
    const defaultWallet = wallets.find((item) => item.is_default) || wallets[0];
    setForm({
      ...EMPTY_FORM,
      category_id: defaultCategory?.id || null,
      wallet_id: defaultWallet?.id || null,
    });
    setEditingId(null);
    if (close) setShowForm(false);
  }

  function beginEdit(transaction) {
    setEditingId(transaction.id);
    setForm({
      description: transaction.description || '',
      amount: String(transaction.amount ?? ''),
      type: transaction.type || 'expense',
      category_id: transaction.category_id || null,
      wallet_id: transaction.wallet_id || null,
      transaction_date: transaction.transaction_date ? String(transaction.transaction_date).slice(0, 10) : '',
      note: transaction.note || '',
    });
    setCategoryEditingId(null);
    setShowForm(true);
    setTimeout(() => listRef.current?.scrollToOffset?.({ offset: 0, animated: true }), 0);
  }

  async function saveTransaction() {
    const amount = Number(form.amount);
    if (!form.description.trim() || !(amount > 0) || !Number.isFinite(amount) || !form.category_id || !form.wallet_id) {
      showAlert('Thiếu thông tin', 'Vui lòng nhập mô tả, số tiền dương, danh mục và ví.');
      return;
    }
    if (form.transaction_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.transaction_date)) {
      showAlert('Ngày không hợp lệ', 'Ngày giao dịch cần có định dạng YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: form.description.trim(),
        amount,
        type: form.type,
        category_id: form.category_id,
        wallet_id: form.wallet_id,
        note: form.note.trim() || null,
      };
      if (form.transaction_date) payload.transaction_date = form.transaction_date;

      if (editingId) await api.updateTransaction(editingId, payload);
      else await api.createTransaction(payload);

      resetForm();
      await load();
    } catch (err) {
      showAlert(editingId ? 'Không thể cập nhật giao dịch' : 'Không thể tạo giao dịch', err.message);
    } finally {
      setSaving(false);
    }
  }

  function deleteTransaction(id) {
    showAlert('Xoá giao dịch', 'Bạn có muốn xoá giao dịch này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive', onPress: async () => {
          try {
            await api.deleteTransaction(id);
            if (editingId === id) resetForm();
            await load();
            showAlert(
              'Đã xoá giao dịch',
              'Bạn có thể hoàn tác trong 30 giây. Hoàn tác sẽ khôi phục giao dịch và số dư ví.',
              [
                { text: 'Đóng', style: 'cancel' },
                {
                  text: 'Hoàn tác',
                  onPress: async () => {
                    try {
                      await api.restoreTransaction(id);
                      await load();
                      showAlert('Đã hoàn tác', 'Giao dịch và số dư ví đã được khôi phục.');
                    } catch (err) {
                      showAlert('Không thể hoàn tác', err.message);
                    }
                  },
                },
              ]
            );
          } catch (err) {
            showAlert('Không thể xoá giao dịch', err.message);
          }
        },
      },
    ]);
  }

  async function changeCategory(transaction, categoryId) {
    if (categorySavingId) return;
    if (Number(categoryId) === Number(transaction.category_id)) {
      setCategoryEditingId(null);
      return;
    }
    setCategorySavingId(transaction.id);
    try {
      const response = await api.updateTransactionCategory(transaction.id, categoryId);
      setTransactions((items) => items.map((item) => (
        item.id === transaction.id ? { ...item, ...(response.data || {}) } : item
      )));
      setCategoryEditingId(null);
    } catch (err) {
      showAlert('Không thể đổi danh mục', err.message);
    } finally {
      setCategorySavingId(null);
    }
  }

  const formCategories = categories.filter((x) => x.type === form.type);

  const ListHeader = (
    <View>
      <Button
        label={showForm ? (editingId ? 'Huỷ chỉnh sửa' : 'Đóng biểu mẫu') : 'Thêm giao dịch mới'}
        icon={showForm ? 'close' : 'add'}
        variant={showForm ? 'secondary' : 'primary'}
        onPress={() => {
          if (showForm) resetForm();
          else {
            resetForm({ close: false });
            setShowForm(true);
          }
        }}
        style={{ marginBottom: 12 }}
      />

      {showForm && (
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formTitle}>{editingId ? 'Chỉnh sửa giao dịch' : 'Giao dịch mới'}</Text>
              <Text style={styles.formHint}>Số dư sẽ được cập nhật theo đúng ví và loại giao dịch.</Text>
            </View>
            {editingId && <View style={styles.editBadge}><Text style={styles.editBadgeText}>Đang sửa</Text></View>}
          </View>

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
              style={[styles.input, { flexGrow: 1, flexBasis: 180, minWidth: 0, marginBottom: 0 }]}
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

          <Text style={styles.inputLabel}>Ví ghi nhận</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.walletList}
          >
            {wallets.map((wallet) => {
              const active = Number(form.wallet_id) === Number(wallet.id);
              return (
                <TouchableOpacity
                  key={wallet.id}
                  style={[styles.walletChip, active && styles.walletChipActive]}
                  onPress={() => setForm((previous) => ({ ...previous, wallet_id: wallet.id }))}
                >
                  <AppIcon name="account-balance-wallet" size={14} color={active ? c.onBrand : c.textMuted} />
                  <View>
                    <Text style={[styles.walletChipName, active && styles.walletChipNameActive]}>{wallet.name}</Text>
                    <Text style={[styles.walletChipBalance, active && styles.walletChipBalanceActive]}>{formatVND(wallet.balance)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.optionalFields}>
            <View style={styles.optionalColumn}>
              <Text style={styles.inputLabel}>Ngày giao dịch</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (mặc định hôm nay)"
                placeholderTextColor={c.textMuted}
                value={form.transaction_date}
                onChangeText={(value) => setForm((previous) => ({ ...previous, transaction_date: value }))}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.optionalColumn}>
              <Text style={styles.inputLabel}>Ghi chú</Text>
              <TextInput
                style={styles.input}
                placeholder="Không bắt buộc"
                placeholderTextColor={c.textMuted}
                value={form.note}
                onChangeText={(value) => setForm((previous) => ({ ...previous, note: value }))}
              />
            </View>
          </View>

          <Button
            label={editingId ? 'Lưu thay đổi' : 'Lưu giao dịch'}
            icon={editingId ? 'save' : 'check-circle'}
            onPress={saveTransaction}
            loading={saving}
          />
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

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState message={error} onRetry={() => { setLoading(true); setError(null); load(); }} />
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      data={transactions}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <View>
          <TransactionCard
            transaction={item}
            onPress={() => setCategoryEditingId((current) => current === item.id ? null : item.id)}
            onLongPress={() => deleteTransaction(item.id)}
          />
          <View style={styles.transactionActions}>
            <TouchableOpacity
              style={styles.transactionAction}
              onPress={() => setCategoryEditingId((current) => current === item.id ? null : item.id)}
            >
              <AppIcon name="category" size={14} color={c.brandText} />
              <Text style={styles.transactionActionText}>Danh mục</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.transactionAction} onPress={() => beginEdit(item)}>
              <AppIcon name="edit" size={14} color={c.brandText} />
              <Text style={styles.transactionActionText}>Chỉnh sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.transactionAction, styles.deleteAction]} onPress={() => deleteTransaction(item.id)}>
              <AppIcon name="delete-outline" size={14} color={c.expense} />
              <Text style={styles.deleteActionText}>Xoá</Text>
            </TouchableOpacity>
          </View>
          {categoryEditingId === item.id && (
            <View style={styles.categoryEditor}>
              <View style={styles.categoryEditorHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryEditorTitle}>Đổi danh mục</Text>
                  <Text style={styles.categoryEditorHint}>
                    {item.source === 'manual'
                      ? 'Chọn danh mục phù hợp cho giao dịch.'
                      : 'Lựa chọn này giúp PERFIN học cách phân loại của bạn.'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setCategoryEditingId(null)}>
                  <AppIcon name="close" size={18} color={c.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryEditorList}>
                {categories.filter((category) => category.type === item.type).map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    active={Number(item.category_id) === Number(category.id)}
                    onPress={() => changeCategory(item, category.id)}
                    style={{ marginRight: 7, opacity: categorySavingId === item.id ? 0.55 : 1 }}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}
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
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 32 },

  form: {
    backgroundColor: t.colors.surface, padding: 16, borderRadius: t.radius.lg,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: 14, ...t.shadows.sm,
  },
  formHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  formTitle: { color: t.colors.text, fontSize: 16, fontWeight: '900' },
  formHint: { color: t.colors.textMuted, fontSize: 11, lineHeight: 16, fontWeight: '600', marginTop: 2 },
  editBadge: { backgroundColor: t.colors.brandSoft, borderRadius: t.radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  editBadgeText: { color: t.colors.brandText, fontSize: 10, fontWeight: '800' },
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
  amountWrapper: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 },
  amountPreviewPill: { backgroundColor: t.colors.brandSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: t.radius.pill },
  amountPreviewText: { color: t.colors.brandText, fontWeight: '800', fontSize: 13 },
  inputLabel: { color: t.colors.textMuted, fontWeight: '700', marginBottom: 8, fontSize: 13 },
  walletList: { gap: 8, paddingBottom: 14 },
  walletChip: {
    minWidth: 138, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 11, paddingVertical: 9, borderRadius: t.radius.md,
    borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  walletChipActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  walletChipName: { color: t.colors.text, fontSize: 12, fontWeight: '800' },
  walletChipNameActive: { color: t.colors.onBrand },
  walletChipBalance: { color: t.colors.textMuted, fontSize: 9, fontWeight: '600', marginTop: 1 },
  walletChipBalanceActive: { color: t.colors.onBrand },
  optionalFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionalColumn: { flexGrow: 1, flexBasis: 220, minWidth: 0 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: t.colors.surface, borderWidth: 1.5, borderColor: t.colors.border,
    borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: t.colors.text },
  resultCount: { color: t.colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 10 },
  transactionActions: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6,
    marginTop: -4, marginBottom: 10, paddingHorizontal: 2,
  },
  transactionAction: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: t.radius.pill,
    backgroundColor: t.colors.brandSoft,
  },
  transactionActionText: { color: t.colors.brandText, fontSize: 10, fontWeight: '800' },
  deleteAction: { backgroundColor: t.colors.expenseSoft },
  deleteActionText: { color: t.colors.expense, fontSize: 10, fontWeight: '800' },
  categoryEditor: {
    backgroundColor: t.colors.surface, borderWidth: 1.5, borderColor: t.colors.brand,
    borderRadius: t.radius.md, padding: 12, marginTop: -5, marginBottom: 10,
  },
  categoryEditorHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  categoryEditorTitle: { color: t.colors.text, fontSize: 13, fontWeight: '900' },
  categoryEditorHint: { color: t.colors.textMuted, fontSize: 10, lineHeight: 14, fontWeight: '600', marginTop: 2 },
  categoryEditorList: { paddingRight: 4 },
});
