import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, RefreshControl, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { HIT_SLOP } from '../theme/tokens';
import { showAlert } from '../utils/alerts';
import AppIcon from '../components/AppIcon';
import CategoryIcon from '../components/CategoryIcon';
import {
  Button, Chip, EmptyState, ErrorState, Screen, Skeleton, SkeletonGroup,
} from '../components/ui';

const TYPE_OPTIONS = [
  { key: null, label: 'Tất cả' },
  { key: 'expense', label: 'Chi tiêu' },
  { key: 'income', label: 'Thu nhập' },
];

const EMPTY_CREATE_FORM = { name: '', icon: '📁', type: 'expense' };

export default function CategoryScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const [categories, setCategories] = useState([]);
  const [typeFilter, setTypeFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    try {
      const response = await api.getCategories();
      setCategories(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Không thể tải danh mục.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibleCategories = useMemo(
    () => categories.filter((category) => !typeFilter || category.type === typeFilter),
    [categories, typeFilter]
  );

  async function createCategory() {
    const name = createForm.name.trim();
    if (!name) {
      showAlert('Thiếu tên danh mục', 'Vui lòng nhập tên danh mục mới.');
      return;
    }
    setCreating(true);
    try {
      await api.createCategory({
        name,
        type: createForm.type,
        icon: createForm.icon.trim() || '📁',
      });
      setCreateForm(EMPTY_CREATE_FORM);
      setShowCreate(false);
      await load();
    } catch (err) {
      showAlert('Không thể tạo danh mục', err.message);
    } finally {
      setCreating(false);
    }
  }

  function beginRename(category) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  async function saveRename(category) {
    const name = editingName.trim();
    if (!name) {
      showAlert('Tên không hợp lệ', 'Tên danh mục không được để trống.');
      return;
    }
    if (name === category.name) {
      setEditingId(null);
      return;
    }
    setSavingId(category.id);
    try {
      const response = await api.updateCategory(category.id, { name });
      setCategories((items) => items.map((item) => (
        item.id === category.id ? { ...item, ...(response.data || {}), name } : item
      )));
      setEditingId(null);
    } catch (err) {
      showAlert('Không thể đổi tên danh mục', err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function requestDelete(category) {
    setDeletingId(category.id);
    let affectedCount = null;
    try {
      const query = new URLSearchParams({
        category_id: String(category.id),
        page: '1',
        limit: '1',
      });
      const response = await api.getTransactions(`?${query.toString()}`);
      affectedCount = Number(response.pagination?.total ?? response.total ?? 0);
    } catch {
      // The destructive action still requires explicit confirmation. The backend
      // performs the reassignment atomically even when this preview is unavailable.
    } finally {
      setDeletingId(null);
    }

    const transactionText = affectedCount == null
      ? 'Mọi giao dịch đang dùng danh mục này'
      : `${affectedCount} giao dịch đang dùng danh mục này`;
    showAlert(
      `Xoá “${category.name}”?`,
      `${transactionText} sẽ được chuyển sang danh mục “Khác” (${category.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}). Các khoản định kỳ và ngân sách liên quan cũng được chuyển an toàn. Thao tác xoá danh mục không thể hoàn tác.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Chuyển và xoá',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(category.id);
            try {
              const response = await api.deleteCategory(category.id);
              const reassigned = Number(response.data?.reassigned_transactions ?? affectedCount ?? 0);
              if (editingId === category.id) setEditingId(null);
              await load();
              showAlert('Đã xoá danh mục', `${reassigned} giao dịch đã được chuyển sang “Khác”.`);
            } catch (err) {
              showAlert('Không thể xoá danh mục', err.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  function openTransactions(category) {
    navigation.navigate('Transactions', {
      categoryId: category.id,
      categoryName: category.name,
      period: 'all',
      filterRequestId: Date.now(),
    });
  }

  if (loading) {
    return (
      <Screen scroll>
        <SkeletonGroup label="Đang tải danh mục">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} height={82} radius={14} style={{ marginBottom: 10 }} />)}
        </SkeletonGroup>
      </Screen>
    );
  }

  if (error && !categories.length) {
    return <Screen><ErrorState message={error} onRetry={() => { setLoading(true); load(); }} /></Screen>;
  }

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} tintColor={c.brand} />}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.infoCard} accessibilityRole="summary">
        <View style={styles.infoIcon}><AppIcon name="category" size={20} color={c.brand} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>Danh mục giúp báo cáo chính xác hơn</Text>
          <Text style={styles.infoText}>
            Danh mục hệ thống được bảo vệ. Bạn có thể tạo, đổi tên hoặc xoá danh mục tự tạo; giao dịch của danh mục bị xoá luôn được chuyển sang “Khác”.
          </Text>
        </View>
      </View>

      <Button
        label={showCreate ? 'Đóng biểu mẫu' : 'Tạo danh mục mới'}
        icon={showCreate ? 'close' : 'add'}
        variant={showCreate ? 'secondary' : 'primary'}
        onPress={() => setShowCreate((value) => !value)}
        style={{ marginBottom: 12 }}
      />

      {showCreate && (
        <View style={styles.createCard}>
          <Text style={styles.sectionTitle}>Danh mục mới</Text>
          <View style={styles.formRow}>
            <TextInput
              accessibilityLabel="Biểu tượng danh mục"
              style={[styles.input, styles.iconInput]}
              value={createForm.icon}
              onChangeText={(icon) => setCreateForm((form) => ({ ...form, icon }))}
              maxLength={8}
              placeholder="📁"
              placeholderTextColor={c.textMuted}
            />
            <TextInput
              accessibilityLabel="Tên danh mục mới"
              style={[styles.input, { flex: 1 }]}
              value={createForm.name}
              onChangeText={(name) => setCreateForm((form) => ({ ...form, name }))}
              placeholder="Ví dụ: Thú cưng"
              placeholderTextColor={c.textMuted}
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={createCategory}
            />
          </View>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.slice(1).map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                active={createForm.type === option.key}
                onPress={() => setCreateForm((form) => ({ ...form, type: option.key }))}
              />
            ))}
          </View>
          <Button label="Lưu danh mục" icon="save" onPress={createCategory} loading={creating} />
        </View>
      )}

      <Text style={styles.filterLabel}>HIỂN THỊ</Text>
      <View style={styles.chipRow}>
        {TYPE_OPTIONS.map((option) => (
          <Chip
            key={String(option.key)}
            label={option.label}
            active={typeFilter === option.key}
            onPress={() => setTypeFilter(option.key)}
          />
        ))}
      </View>

      <Text style={styles.resultText}>{visibleCategories.length} danh mục</Text>
      {visibleCategories.map((category) => {
        const isEditing = editingId === category.id;
        const isDefault = Boolean(category.is_default);
        const busy = savingId === category.id || deletingId === category.id;
        return (
          <View key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: category.type === 'income' ? c.incomeSoft : c.expenseSoft }]}>
                <CategoryIcon icon={category.icon} name={category.name} type={category.type} size={21} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <TextInput
                    accessibilityLabel={`Tên mới cho danh mục ${category.name}`}
                    autoFocus
                    style={styles.renameInput}
                    value={editingName}
                    onChangeText={setEditingName}
                    maxLength={50}
                    returnKeyType="done"
                    onSubmitEditing={() => saveRename(category)}
                  />
                ) : (
                  <Text numberOfLines={1} style={styles.categoryName}>{category.name}</Text>
                )}
                <View style={styles.metaRow}>
                  <Text style={[styles.typeText, { color: category.type === 'income' ? c.income : c.expense }]}>
                    {category.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                  </Text>
                  <Text style={styles.countText}>{Number(category.transaction_count || 0)} giao dịch</Text>
                  {isDefault && <Text style={styles.defaultBadge}>Mặc định</Text>}
                </View>
              </View>
            </View>

            {isEditing ? (
              <View style={styles.actionRow}>
                <Button
                  label="Huỷ"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => setEditingId(null)}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Lưu tên"
                  icon="save"
                  size="sm"
                  fullWidth={false}
                  onPress={() => saveRename(category)}
                  loading={savingId === category.id}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <View style={styles.actionRow}>
                <Button
                  label="Xem giao dịch"
                  icon="receipt-long"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => openTransactions(category)}
                  style={{ flexGrow: 1 }}
                />
                {!isDefault && (
                  <>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Đổi tên danh mục ${category.name}`}
                      hitSlop={HIT_SLOP}
                      style={styles.iconButton}
                      disabled={busy}
                      onPress={() => beginRename(category)}
                    >
                      <AppIcon name="edit" size={18} color={c.brandText} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Xoá danh mục ${category.name}`}
                      hitSlop={HIT_SLOP}
                      style={[styles.iconButton, styles.deleteButton]}
                      disabled={busy}
                      onPress={() => requestDelete(category)}
                    >
                      <AppIcon name="delete-outline" size={18} color={c.expense} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}

      {!visibleCategories.length && (
        <EmptyState emoji="🏷️" title="Chưa có danh mục" message="Tạo danh mục đầu tiên để phân loại giao dịch." />
      )}
    </Screen>
  );
}

const createStyles = (t) => StyleSheet.create({
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: t.colors.brandSoft, borderWidth: 1, borderColor: t.colors.brand,
    borderRadius: t.radius.lg, padding: 14, marginBottom: 14,
  },
  infoIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: t.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  infoTitle: { ...t.typo.bodyStrong, color: t.colors.text },
  infoText: { ...t.typo.caption, color: t.colors.textSecondary, marginTop: 3 },
  createCard: {
    backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border,
    borderRadius: t.radius.lg, padding: 14, marginBottom: 16, gap: 12,
  },
  sectionTitle: { ...t.typo.subhead, color: t.colors.text },
  formRow: { flexDirection: 'row', gap: 10 },
  input: {
    borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15,
    color: t.colors.text, backgroundColor: t.colors.surfaceAlt,
  },
  iconInput: { width: 64, textAlign: 'center' },
  filterLabel: { ...t.typo.label, color: t.colors.textMuted, marginLeft: 4, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  resultText: { ...t.typo.caption, color: t.colors.textMuted, marginBottom: 10 },
  categoryCard: {
    backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border,
    borderRadius: t.radius.lg, padding: 14, marginBottom: 10,
  },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryName: { ...t.typo.bodyStrong, color: t.colors.text },
  renameInput: {
    borderWidth: 1.5, borderColor: t.colors.brand, borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceAlt, color: t.colors.text, fontSize: 15,
    fontWeight: '700', paddingHorizontal: 10, paddingVertical: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  typeText: { ...t.typo.label },
  countText: { ...t.typo.label, color: t.colors.textMuted },
  defaultBadge: {
    color: t.colors.textMuted, backgroundColor: t.colors.surfaceAlt, overflow: 'hidden',
    borderRadius: t.radius.pill, paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, fontWeight: '800',
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 },
  iconButton: {
    width: 40, height: 40, borderRadius: t.radius.md, backgroundColor: t.colors.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteButton: { backgroundColor: t.colors.expenseSoft },
});
