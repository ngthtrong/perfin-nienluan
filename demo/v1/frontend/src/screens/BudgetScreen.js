import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { api } from '../services/api.service';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';
import { currentPeriod, formatVND } from '../utils/formatters';
import BudgetProgressBar from '../components/BudgetProgressBar';
import AppIcon from '../components/AppIcon';
import CategoryIcon from '../components/CategoryIcon';

function getStatusMeta(status) {
  if (status === 'exceeded') return { label: 'Vượt mức', color: COLORS.expense, bg: COLORS.expenseLight, icon: 'dangerous' };
  if (status === 'danger')   return { label: 'Sắp đến',  color: '#EA580C',       bg: '#FEF3C7',           icon: 'warning-amber' };
  if (status === 'warning')  return { label: 'Chú ý',    color: '#D97706',       bg: '#FFFBEB',           icon: 'info-outline' };
  return                            { label: 'Ổn định',  color: COLORS.income,   bg: COLORS.incomeLight,  icon: 'check-circle-outline' };
}

function SkeletonBudget() {
  return (
    <View style={{ padding: 16, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ width: '40%', height: 14, backgroundColor: COLORS.borderLight, borderRadius: 4 }} />
        <View style={{ width: '20%', height: 22, backgroundColor: COLORS.borderLight, borderRadius: 12 }} />
      </View>
      <View style={{ height: 8, backgroundColor: COLORS.borderLight, borderRadius: 4, marginBottom: 10 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: '35%', height: 11, backgroundColor: COLORS.borderLight, borderRadius: 4 }} />
        <View style={{ width: '35%', height: 11, backgroundColor: COLORS.borderLight, borderRadius: 4 }} />
      </View>
    </View>
  );
}

export default function BudgetScreen() {
  const period = currentPeriod();
  const [progress, setProgress] = useState([]);
  const [categories, setCategories] = useState([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const [items, cats] = await Promise.all([
        api.getBudgetProgress(period.month, period.year),
        api.getCategories('expense'),
      ]);
      setProgress(items.data || []);
      setCategories(cats.data || []);
      setCategoryId((prev) => prev || cats.data?.[0]?.id || null);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period.month, period.year]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function add() {
    if (!categoryId || !amount || Number(amount) <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn danh mục và nhập số tiền ngân sách.');
      return;
    }
    setSaving(true);
    try {
      await api.createBudget({ category_id: categoryId, amount_limit: Number(amount), month: period.month, year: period.year });
      setAmount('');
      setShowForm(false);
      await load();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo ngân sách');
    } finally {
      setSaving(false);
    }
  }

  const totalBudget = progress.reduce((s, i) => s + Number(i.amount_limit), 0);
  const totalSpent  = progress.reduce((s, i) => s + Number(i.spent), 0);
  const overallPct  = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  if (loading) {
    return (
      <View style={{ padding: 16 }}>
        {[1, 2, 3].map((i) => <SkeletonBudget key={i} />)}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIconWrap}>
          <AppIcon name="warning-amber" size={28} color={COLORS.expense} />
        </View>
        <Text style={styles.errorTitle}>Không tải được dữ liệu</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); setError(null); load(); }}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={progress}
      keyExtractor={(item) => item.budget_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      ListHeaderComponent={
        <View>
          {/* Overview card */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewLeft}>
              <View style={styles.periodChip}>
                <AppIcon name="calendar-today" size={13} color={COLORS.primary} />
                <Text style={styles.periodText}>Tháng {period.month}/{period.year}</Text>
              </View>
              <Text style={styles.overviewSpent}>
                <Text style={{ color: COLORS.expense, fontWeight: '900' }}>{formatVND(totalSpent)}</Text>
              </Text>
              <Text style={styles.overviewTotal}>/ {formatVND(totalBudget)} ngân sách</Text>
            </View>
            <View style={[
              styles.pctCircle,
              overallPct > 100 ? styles.pctCircleDanger : overallPct > 70 ? styles.pctCircleWarning : styles.pctCircleSafe,
            ]}>
              <Text style={[
                styles.pctText,
                overallPct > 100 ? { color: COLORS.expense } : overallPct > 70 ? { color: '#D97706' } : { color: COLORS.income },
              ]}>
                {overallPct}%
              </Text>
              <Text style={styles.pctLabel}>used</Text>
            </View>
          </View>

          {/* Add budget toggle */}
          <TouchableOpacity
            style={[styles.addToggle, showForm && styles.addToggleActive]}
            onPress={() => setShowForm((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.addIcon, showForm && styles.addIconClose]}>
              <AppIcon name={showForm ? 'close' : 'add'} size={18} color={showForm ? COLORS.expense : '#fff'} />
            </View>
            <Text style={[styles.addToggleText, showForm && styles.addToggleTextClose]}>
              {showForm ? 'Đóng' : 'Thêm ngân sách mới'}
            </Text>
            {!showForm && <AppIcon name="chevron-right" size={18} color="rgba(255,255,255,0.7)" />}
          </TouchableOpacity>

          {showForm && (
            <View style={styles.form}>
              <Text style={styles.formLabel}>Chọn danh mục</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, categoryId === cat.id && styles.catChipActive]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <CategoryIcon icon={cat.icon} name={cat.name} type={cat.type} size={15} color={categoryId === cat.id ? '#fff' : COLORS.textSecondary} />
                    <Text style={[styles.catChipText, categoryId === cat.id && styles.catChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Mức ngân sách (VND)</Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="Ví dụ: 2,000,000"
                  placeholderTextColor={COLORS.muted}
                />
                {amount.length > 0 && (
                  <View style={styles.amountPreview}>
                    <Text style={styles.amountPreviewText}>{formatVND(Number(amount))}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={add} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
                    <>
                      <AppIcon name="savings" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Tạo ngân sách</Text>
                    </>
                  )}
              </TouchableOpacity>
            </View>
          )}

          {progress.length > 0 && (
            <Text style={styles.sectionTitle}>Theo danh mục</Text>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const meta = getStatusMeta(item.status);
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.catIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <CategoryIcon icon={item.category_icon} name={item.category_name} type="expense" size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.cardTitle}>{item.category_name}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                <AppIcon name={meta.icon} size={12} color={meta.color} />
                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>

            <BudgetProgressBar percentage={item.percentage} spent={item.spent} limit={item.amount_limit} status={item.status} />

            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>Đã chi: <Text style={{ color: COLORS.expense, fontWeight: '700' }}>{formatVND(item.spent)}</Text></Text>
              <Text style={styles.metaText}>
                Còn lại: <Text style={{ color: item.remaining < 0 ? COLORS.expense : COLORS.income, fontWeight: '700' }}>
                  {formatVND(item.remaining)}
                </Text>
              </Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIconText}>💰</Text>
          </View>
          <Text style={styles.emptyTitle}>Chưa có ngân sách</Text>
          <Text style={styles.emptyMsg}>Thêm ngân sách để kiểm soát chi tiêu tốt hơn!</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)}>
            <AppIcon name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Thêm ngân sách</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  // ── Overview card ─────────────────────────────────────────────────────────────
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    ...SHADOWS.md,
  },
  overviewLeft: { flex: 1 },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  periodText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  overviewSpent: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginBottom: 2 },
  overviewTotal: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  pctCircle: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
  },
  pctCircleSafe: { borderColor: COLORS.income, backgroundColor: COLORS.incomeLight },
  pctCircleWarning: { borderColor: '#D97706', backgroundColor: '#FEF3C7' },
  pctCircleDanger: { borderColor: COLORS.expense, backgroundColor: COLORS.expenseLight },
  pctText: { fontSize: 18, fontWeight: '900' },
  pctLabel: { fontSize: 9, color: COLORS.muted, fontWeight: '600' },

  // ── Add toggle ────────────────────────────────────────────────────────────────
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
  addToggleActive: { backgroundColor: COLORS.expenseLight, borderWidth: 1.5, borderColor: COLORS.expense },
  addIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  addIconClose: { backgroundColor: 'rgba(244,63,94,0.1)' },
  addToggleText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 14 },
  addToggleTextClose: { color: COLORS.expense },

  // ── Form ──────────────────────────────────────────────────────────────────────
  form: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  formLabel: { color: COLORS.muted, fontWeight: '700', fontSize: 13, marginBottom: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: 13, marginBottom: 12, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.background,
  },
  amountPreview: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full },
  amountPreviewText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, padding: 14, borderRadius: RADIUS.md, ...SHADOWS.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // ── Section ───────────────────────────────────────────────────────────────────
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 12 },

  // ── Budget card ───────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  catIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaText: { color: COLORS.muted, fontSize: 13 },

  // ── Empty ─────────────────────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 48, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, marginTop: 8 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIconText: { fontSize: 36 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 20, fontSize: 14, paddingHorizontal: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.full, ...SHADOWS.sm },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Error ─────────────────────────────────────────────────────────────────────
  errorIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.expenseLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  errorMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.full, ...SHADOWS.sm },
  retryText: { color: '#fff', fontWeight: '700' },
});
