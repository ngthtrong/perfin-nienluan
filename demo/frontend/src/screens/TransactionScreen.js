import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ScrollView, ActivityIndicator,
} from 'react-native';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { HIT_SLOP } from '../theme/tokens';
import { formatMoneyValue, formatVND, parseMoneyInput, toDateInputValue } from '../utils/formatters';
import { showAlert } from '../utils/alerts';
import TransactionCard from '../components/TransactionCard';
import AppIcon from '../components/AppIcon';
import {
  Button, Chip, DatePickerField, EmptyState, ErrorState, MoneyInput, Skeleton, SkeletonGroup,
} from '../components/ui';

const TYPE_FILTERS = [
  { key: null, label: 'Tất cả', icon: 'apps' },
  { key: 'expense', label: 'Chi tiêu', icon: 'trending-down' },
  { key: 'income', label: 'Thu nhập', icon: 'trending-up' },
];

const PERIOD_FILTERS = [
  { key: 'current_month', label: 'Tháng hiện tại' },
  { key: 'all', label: 'Toàn bộ thời gian' },
  { key: 'custom', label: 'Tùy chọn' },
];

const SORT_OPTIONS = [
  { key: 'transaction_date', label: 'Thời gian' },
  { key: 'amount', label: 'Số tiền' },
  { key: 'category', label: 'Danh mục' },
  { key: 'description', label: 'Tên giao dịch' },
];

const PAGE_SIZE = 50;

function dateInput(year, month, day) {
  return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}

function currentMonthRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return {
    from: dateInput(year, month, 1),
    to: dateInput(year, month, now.getDate()),
  };
}

function defaultFilters() {
  return {
    period: 'current_month',
    ...currentMonthRange(),
    type: null,
    categoryId: null,
    sortBy: 'transaction_date',
    sortOrder: 'desc',
  };
}

function filtersFromRoute(params) {
  if (!params?.categoryId) return defaultFilters();
  return {
    ...defaultFilters(),
    period: params.period === 'all' ? 'all' : 'current_month',
    from: params.period === 'all' ? '' : currentMonthRange().from,
    to: params.period === 'all' ? '' : currentMonthRange().to,
    categoryId: Number(params.categoryId),
  };
}

function transactionQuery(filters, search, page) {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.categoryId) params.set('category_id', String(filters.categoryId));
  if (filters.type) params.set('type', filters.type);
  if (search.trim()) params.set('search', search.trim());
  params.set('sort_by', filters.sortBy);
  params.set('sort_order', filters.sortOrder);
  return `?${params.toString()}`;
}

const EMPTY_FORM = {
  description: '',
  amount: '',
  type: 'expense',
  category_id: null,
  wallet_id: null,
  transaction_date: '',
  note: '',
};

export default function TransactionScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [categoryEditingId, setCategoryEditingId] = useState(null);
  const [categorySavingId, setCategorySavingId] = useState(null);
  const [filters, setFilters] = useState(() => filtersFromRoute(route?.params));
  const [filterDraft, setFilterDraft] = useState(() => filtersFromRoute(route?.params));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, hasNextPage: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const listRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const transactionRequestRef = useRef(0);

  const loadReferences = useCallback(async () => {
    try {
      const [cats, walletResponse] = await Promise.all([
        api.getCategories(),
        api.getWallets(),
      ]);
      const nextCategories = cats.data || [];
      const nextWallets = walletResponse.data || [];
      setCategories(nextCategories);
      setWallets(nextWallets);
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
    }
  }, []);

  const fetchPage = useCallback((page, selectedFilters = filters, selectedSearch = search) => (
    api.getTransactions(transactionQuery(selectedFilters, selectedSearch, page))
  ), [filters, search]);

  const loadTransactions = useCallback(async ({ page = 1, append = false, silent = false } = {}) => {
    const requestId = append
      ? transactionRequestRef.current
      : transactionRequestRef.current + 1;
    if (!append) {
      transactionRequestRef.current = requestId;
      setLoadingMore(false);
      setLoadingAll(false);
    }
    const isCurrentRequest = () => requestId === transactionRequestRef.current;

    if (!hasLoadedRef.current) setLoading(true);
    else if (!silent && !append) setFiltering(true);
    try {
      const response = await fetchPage(page);
      if (!isCurrentRequest()) return false;
      const rows = response.data || [];
      setTransactions((current) => {
        if (!append) return rows;
        const ids = new Set(current.map((item) => String(item.id)));
        return [...current, ...rows.filter((item) => !ids.has(String(item.id)))];
      });
      const meta = response.pagination || {};
      const total = Number(meta.total ?? response.total ?? rows.length);
      const totalPages = Number(meta.totalPages ?? Math.ceil(total / PAGE_SIZE));
      setPagination({
        page: Number(meta.page ?? page),
        limit: Number(meta.limit ?? PAGE_SIZE),
        total,
        totalPages,
        hasNextPage: Boolean(meta.hasNextPage ?? page < totalPages),
      });
      setError(null);
      hasLoadedRef.current = true;
      return true;
    } catch (err) {
      if (!isCurrentRequest()) return false;
      if (append || silent || hasLoadedRef.current) {
        showAlert(append ? 'Không thể tải thêm giao dịch' : 'Không thể áp dụng bộ lọc', err.message);
      } else {
        setError(err.message || 'Không thể tải giao dịch.');
      }
      return false;
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
        setFiltering(false);
      }
    }
  }, [fetchPage]);

  useEffect(() => { loadReferences(); }, [loadReferences]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  useEffect(() => {
    if (!route?.params?.categoryId) return;
    transactionRequestRef.current += 1;
    setLoadingMore(false);
    setLoadingAll(false);
    const next = filtersFromRoute(route.params);
    setFilterDraft(next);
    setFilters(next);
    setSearch('');
    setSearchDraft('');
    setFiltersOpen(true);
  }, [route?.params?.filterRequestId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadReferences(), loadTransactions({ silent: true })]);
    setRefreshing(false);
  }, [loadReferences, loadTransactions]);

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
      amount: formatMoneyValue(transaction.amount),
      type: transaction.type || 'expense',
      category_id: transaction.category_id || null,
      wallet_id: transaction.wallet_id || null,
      transaction_date: toDateInputValue(transaction.transaction_date),
      note: transaction.note || '',
    });
    setCategoryEditingId(null);
    setShowForm(true);
    setTimeout(() => listRef.current?.scrollToOffset?.({ offset: 0, animated: true }), 0);
  }

  async function saveTransaction() {
    const amount = parseMoneyInput(form.amount);
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
      await Promise.all([loadReferences(), loadTransactions()]);
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
            await Promise.all([loadReferences(), loadTransactions()]);
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
                      await Promise.all([loadReferences(), loadTransactions()]);
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

  function choosePeriod(period) {
    if (period === 'current_month') {
      setFilterDraft((current) => ({ ...current, period, ...currentMonthRange() }));
      return;
    }
    if (period === 'all') {
      setFilterDraft((current) => ({ ...current, period, from: '', to: '' }));
      return;
    }
    setFilterDraft((current) => ({ ...current, period }));
  }

  function applyFilters() {
    if (filterDraft.period === 'custom') {
      const validDate = (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
      if (!validDate(filterDraft.from) || !validDate(filterDraft.to)) {
        showAlert('Thời gian không hợp lệ', 'Ngày bắt đầu và kết thúc cần có định dạng YYYY-MM-DD.');
        return;
      }
      if (filterDraft.from && filterDraft.to && filterDraft.from > filterDraft.to) {
        showAlert('Khoảng thời gian không hợp lệ', 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
        return;
      }
    }
    transactionRequestRef.current += 1;
    setLoadingMore(false);
    setLoadingAll(false);
    setFiltering(true);
    setFilters({ ...filterDraft });
    setSearch(searchDraft.trim());
  }

  function resetFilters() {
    transactionRequestRef.current += 1;
    setLoadingMore(false);
    setLoadingAll(false);
    setFiltering(true);
    const next = defaultFilters();
    setFilterDraft(next);
    setFilters(next);
    setSearchDraft('');
    setSearch('');
  }

  async function loadMoreTransactions() {
    if (filtering || loadingMore || loadingAll || !pagination.hasNextPage) return;
    setLoadingMore(true);
    await loadTransactions({ page: pagination.page + 1, append: true, silent: true });
    setLoadingMore(false);
  }

  async function loadAllTransactions() {
    if (filtering || loadingAll || loadingMore || !pagination.hasNextPage) return;
    const requestId = transactionRequestRef.current;
    const isCurrentRequest = () => requestId === transactionRequestRef.current;
    setLoadingAll(true);
    try {
      const pendingRows = [];
      let finalMeta = pagination;
      for (let page = pagination.page + 1; page <= pagination.totalPages; page += 1) {
        const response = await fetchPage(page);
        if (!isCurrentRequest()) return;
        pendingRows.push(...(response.data || []));
        const meta = response.pagination || {};
        finalMeta = {
          page: Number(meta.page ?? page),
          limit: Number(meta.limit ?? PAGE_SIZE),
          total: Number(meta.total ?? response.total ?? pagination.total),
          totalPages: Number(meta.totalPages ?? pagination.totalPages),
          hasNextPage: Boolean(meta.hasNextPage ?? page < pagination.totalPages),
        };
      }
      if (!isCurrentRequest()) return;
      setTransactions((current) => {
        const ids = new Set(current.map((item) => String(item.id)));
        return [...current, ...pendingRows.filter((item) => {
          const id = String(item.id);
          if (ids.has(id)) return false;
          ids.add(id);
          return true;
        })];
      });
      setPagination(finalMeta);
    } catch (err) {
      if (isCurrentRequest()) showAlert('Không thể tải toàn bộ giao dịch', err.message);
    } finally {
      if (isCurrentRequest()) setLoadingAll(false);
    }
  }

  const activeFilterSummary = useMemo(() => {
    let periodLabel = 'Toàn bộ thời gian';
    if (filters.period === 'current_month') {
      const [year, month] = filters.from.split('-');
      periodLabel = `Tháng ${Number(month)}/${year}`;
    } else if (filters.period === 'custom') {
      periodLabel = filters.from || filters.to
        ? `${filters.from || 'Bắt đầu'} → ${filters.to || 'Hiện tại'}`
        : 'Toàn bộ thời gian';
    }
    const typeLabel = TYPE_FILTERS.find((item) => item.key === filters.type)?.label || 'Tất cả';
    const categoryLabel = categories.find((item) => Number(item.id) === Number(filters.categoryId))?.name || 'Mọi danh mục';
    const sortLabel = SORT_OPTIONS.find((item) => item.key === filters.sortBy)?.label || 'Thời gian';
    return [periodLabel, typeLabel, categoryLabel, `${sortLabel} ${filters.sortOrder === 'asc' ? 'tăng dần' : 'giảm dần'}`]
      .concat(search ? [`“${search}”`] : [])
      .join(' • ');
  }, [categories, filters, search]);

  const formCategories = categories.filter((x) => x.type === form.type);

  const ListHeader = (
    <View>
      <View style={styles.topActions}>
        <Button
          label={showForm ? (editingId ? 'Huỷ chỉnh sửa' : 'Đóng biểu mẫu') : 'Thêm giao dịch'}
          icon={showForm ? 'close' : 'add'}
          variant={showForm ? 'secondary' : 'primary'}
          fullWidth={false}
          onPress={() => {
            if (showForm) resetForm();
            else {
              resetForm({ close: false });
              setShowForm(true);
            }
          }}
          style={{ flexGrow: 1 }}
        />
        <Button
          label="Quản lý danh mục"
          icon="category"
          variant="secondary"
          fullWidth={false}
          onPress={() => navigation.navigate('Categories')}
          style={{ flexGrow: 1 }}
        />
      </View>

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
            <MoneyInput
              style={[styles.input, { flexGrow: 1, flexBasis: 180, minWidth: 0, marginBottom: 0 }]}
              placeholder="Số tiền (VND)"
              placeholderTextColor={c.textMuted}
              value={form.amount}
              onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))}
            />
            {form.amount.length > 0 && (
              <View style={styles.amountPreviewPill}>
                <Text style={styles.amountPreviewText}>{formatVND(parseMoneyInput(form.amount))}</Text>
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
              <DatePickerField
                accessibilityLabel="Chọn ngày giao dịch"
                maximumDate={new Date()}
                placeholder="Mặc định hôm nay"
                style={{ marginBottom: 12 }}
                value={form.transaction_date}
                onChange={(value) => setForm((previous) => ({ ...previous, transaction_date: value }))}
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

      <View style={styles.filterPanel}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={filtersOpen ? 'Ẩn bộ lọc giao dịch' : 'Mở bộ lọc giao dịch'}
          accessibilityState={{ expanded: filtersOpen }}
          style={styles.filterHeader}
          onPress={() => setFiltersOpen((value) => !value)}
        >
          <View style={styles.filterIcon}><AppIcon name="tune" size={19} color={c.brand} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.filterTitle}>Bộ lọc giao dịch</Text>
            <Text style={styles.filterSummary}>{activeFilterSummary}</Text>
          </View>
          <AppIcon name={filtersOpen ? 'expand-less' : 'expand-more'} size={22} color={c.textMuted} />
        </TouchableOpacity>

        {filtersOpen && (
          <View style={styles.filterBody}>
            <Text style={styles.filterLabel}>Thời gian</Text>
            <View style={styles.filterRow}>
              {PERIOD_FILTERS.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  active={filterDraft.period === option.key}
                  onPress={() => choosePeriod(option.key)}
                />
              ))}
            </View>
            {filterDraft.period === 'custom' && (
              <View style={styles.dateRow}>
                <View style={styles.dateColumn}>
                  <Text style={styles.smallLabel}>Từ ngày</Text>
                  <DatePickerField
                    accessibilityLabel="Lọc từ ngày"
                    maximumDate={filterDraft.to || new Date()}
                    placeholder="Chọn ngày bắt đầu"
                    value={filterDraft.from}
                    onChange={(from) => setFilterDraft((current) => ({ ...current, from }))}
                  />
                </View>
                <View style={styles.dateColumn}>
                  <Text style={styles.smallLabel}>Đến ngày</Text>
                  <DatePickerField
                    accessibilityLabel="Lọc đến ngày"
                    minimumDate={filterDraft.from || undefined}
                    maximumDate={new Date()}
                    placeholder="Chọn ngày kết thúc"
                    value={filterDraft.to}
                    onChange={(to) => setFilterDraft((current) => ({ ...current, to }))}
                  />
                </View>
              </View>
            )}

            <Text style={styles.filterLabel}>Thu / chi</Text>
            <View style={styles.filterRow}>
              {TYPE_FILTERS.map((option) => (
                <Chip
                  key={String(option.key)}
                  label={option.label}
                  icon={option.icon}
                  active={filterDraft.type === option.key}
                  onPress={() => setFilterDraft((current) => {
                    const selectedCategory = categories.find((item) => Number(item.id) === Number(current.categoryId));
                    return {
                      ...current,
                      type: option.key,
                      categoryId: option.key && selectedCategory?.type !== option.key ? null : current.categoryId,
                    };
                  })}
                />
              ))}
            </View>

            <Text style={styles.filterLabel}>Danh mục</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterList}>
              <Chip
                label="Mọi danh mục"
                active={!filterDraft.categoryId}
                onPress={() => setFilterDraft((current) => ({ ...current, categoryId: null }))}
                style={{ marginRight: 7 }}
              />
              {categories
                .filter((category) => !filterDraft.type || category.type === filterDraft.type)
                .map((category) => (
                  <Chip
                    key={category.id}
                    label={!filterDraft.type
                      ? `${category.name} · ${category.type === 'income' ? 'Thu' : 'Chi'}`
                      : category.name}
                    active={Number(filterDraft.categoryId) === Number(category.id)}
                    onPress={() => setFilterDraft((current) => ({ ...current, categoryId: category.id }))}
                    style={{ marginRight: 7 }}
                  />
                ))}
            </ScrollView>

            <Text style={styles.filterLabel}>Sắp xếp theo</Text>
            <View style={styles.filterRow}>
              {SORT_OPTIONS.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  active={filterDraft.sortBy === option.key}
                  onPress={() => setFilterDraft((current) => ({ ...current, sortBy: option.key }))}
                />
              ))}
            </View>
            <View style={styles.filterRow}>
              <Chip
                label="Tăng dần"
                icon="arrow-upward"
                active={filterDraft.sortOrder === 'asc'}
                onPress={() => setFilterDraft((current) => ({ ...current, sortOrder: 'asc' }))}
              />
              <Chip
                label="Giảm dần"
                icon="arrow-downward"
                active={filterDraft.sortOrder === 'desc'}
                onPress={() => setFilterDraft((current) => ({ ...current, sortOrder: 'desc' }))}
              />
            </View>

            <Text style={styles.filterLabel}>Tên giao dịch</Text>
            <View style={styles.searchWrapper}>
              <AppIcon name="search" size={18} color={c.textMuted} />
              <TextInput
                accessibilityLabel="Tìm theo tên giao dịch"
                style={styles.searchInput}
                placeholder="Nhập tên hoặc mô tả..."
                placeholderTextColor={c.textMuted}
                value={searchDraft}
                onChangeText={setSearchDraft}
                returnKeyType="search"
                onSubmitEditing={applyFilters}
              />
              {searchDraft.length > 0 && (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Xoá từ khoá" onPress={() => setSearchDraft('')}>
                  <AppIcon name="close" size={17} color={c.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterActions}>
              <Button
                label="Đặt lại"
                icon="restart-alt"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={resetFilters}
                style={{ flex: 1 }}
              />
              <Button
                label="Áp dụng bộ lọc"
                icon="filter-alt"
                size="sm"
                fullWidth={false}
                onPress={applyFilters}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.resultHeader}>
        <Text style={styles.resultCount} accessibilityLiveRegion="polite">
          Đang hiển thị {transactions.length} / {pagination.total} giao dịch
        </Text>
        {filtering && <ActivityIndicator size="small" color={c.brand} />}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SkeletonGroup label="Đang tải giao dịch" style={[styles.container, { padding: 16, gap: 8 }]}>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={66} radius={14} />)}
      </SkeletonGroup>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            setError(null);
            loadReferences();
            loadTransactions();
          }}
        />
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
              accessibilityRole="button"
              accessibilityLabel={`Đổi danh mục giao dịch ${item.description}`}
              style={styles.transactionAction}
              onPress={() => setCategoryEditingId((current) => current === item.id ? null : item.id)}
            >
              <AppIcon name="category" size={14} color={c.brandText} />
              <Text style={styles.transactionActionText}>Danh mục</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Chỉnh sửa giao dịch ${item.description}`}
              style={styles.transactionAction}
              onPress={() => beginEdit(item)}
            >
              <AppIcon name="edit" size={14} color={c.brandText} />
              <Text style={styles.transactionActionText}>Chỉnh sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Xoá giao dịch ${item.description}`}
              style={[styles.transactionAction, styles.deleteAction]}
              onPress={() => deleteTransaction(item.id)}
            >
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
                <TouchableOpacity
                  onPress={() => setCategoryEditingId(null)}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng bảng đổi danh mục"
                >
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
      ListEmptyComponent={filtering ? null : (
        <EmptyState
          emoji="📭"
          title="Không tìm thấy giao dịch"
          message="Thử thay đổi bộ lọc hoặc thêm một giao dịch mới."
        />
      )}
      ListFooterComponent={pagination.hasNextPage ? (
        <View style={styles.paginationCard}>
          <Text style={styles.paginationText}>
            Còn {Math.max(pagination.total - transactions.length, 0)} giao dịch phù hợp
          </Text>
          <View style={styles.paginationActions}>
            <Button
              label="Tải thêm 50"
              icon="expand-more"
              variant="secondary"
              size="sm"
              fullWidth={false}
              loading={loadingMore}
              disabled={filtering || loadingAll}
              onPress={loadMoreTransactions}
              style={{ flex: 1 }}
            />
            <Button
              label="Tải toàn bộ"
              icon="unfold-more"
              size="sm"
              fullWidth={false}
              loading={loadingAll}
              disabled={filtering || loadingMore}
              onPress={loadAllTransactions}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}
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
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },

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

  filterPanel: {
    backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border,
    borderRadius: t.radius.lg, marginBottom: 12, overflow: 'hidden', ...t.shadows.sm,
  },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  filterIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: t.colors.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  filterTitle: { ...t.typo.bodyStrong, color: t.colors.text },
  filterSummary: { ...t.typo.label, color: t.colors.textMuted, marginTop: 3 },
  filterBody: { borderTopWidth: 1, borderTopColor: t.colors.border, padding: 14 },
  filterLabel: { ...t.typo.caption, color: t.colors.textSecondary, marginBottom: 8 },
  smallLabel: { ...t.typo.label, color: t.colors.textMuted, marginBottom: 6 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  categoryFilterList: { paddingBottom: 14, paddingRight: 4 },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  dateColumn: { flexGrow: 1, flexBasis: 210, minWidth: 0 },
  filterInput: {
    borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14,
    color: t.colors.text, backgroundColor: t.colors.surfaceAlt,
  },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: t.colors.surfaceAlt, borderWidth: 1.5, borderColor: t.colors.border,
    borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: t.colors.text },
  filterActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  resultCount: { flex: 1, color: t.colors.textMuted, fontSize: 12, fontWeight: '700' },
  paginationCard: {
    backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border,
    borderRadius: t.radius.lg, padding: 14, marginTop: 8,
  },
  paginationText: { ...t.typo.caption, color: t.colors.textMuted, textAlign: 'center', marginBottom: 10 },
  paginationActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
