import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { currentPeriod, formatVND } from '../utils/formatters';
import BudgetProgressBar from '../components/BudgetProgressBar';
import AppIcon from '../components/AppIcon';
import CategoryIcon from '../components/CategoryIcon';
import { AppHeader, Button, EmptyState, ErrorState, Skeleton } from '../components/ui';

function getStatusMeta(status, c) {
  if (status === 'exceeded') return { label: 'Vượt mức', color: c.expense, bg: c.expenseSoft, icon: 'dangerous' };
  if (status === 'danger')   return { label: 'Sắp đến',  color: c.expense, bg: c.expenseSoft, icon: 'warning-amber' };
  if (status === 'warning')  return { label: 'Chú ý',    color: c.warning, bg: c.warningSoft, icon: 'info-outline' };
  return                            { label: 'Ổn định',  color: c.income,  bg: c.incomeSoft,  icon: 'check-circle-outline' };
}

export default function BudgetScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;
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
  const totalSpent = progress.reduce((s, i) => s + Number(i.spent), 0);
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const pctColor = overallPct > 100 ? c.expense : overallPct > 70 ? c.warning : c.income;
  const pctBg = overallPct > 100 ? c.expenseSoft : overallPct > 70 ? c.warningSoft : c.incomeSoft;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader subtitle="Ngân sách" showAIStatus={false} />
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={96} radius={18} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader subtitle="Ngân sách" showAIStatus={false} />
        <ErrorState message={error} onRetry={() => { setLoading(true); setError(null); load(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader subtitle="Ngân sách" showAIStatus={false} />
      <FlatList
        contentContainerStyle={styles.content}
        data={progress}
        keyExtractor={(item) => String(item.budget_id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
        ListHeaderComponent={
          <View>
            <View style={styles.overviewCard}>
              <View style={{ flex: 1 }}>
                <View style={styles.periodChip}>
                  <AppIcon name="calendar-today" size={13} color={c.brandText} />
                  <Text style={styles.periodText}>Tháng {period.month}/{period.year}</Text>
                </View>
                <Text style={styles.overviewSpent}>{formatVND(totalSpent)}</Text>
                <Text style={styles.overviewTotal}>/ {formatVND(totalBudget)} ngân sách</Text>
              </View>
              <View style={[styles.pctCircle, { borderColor: pctColor, backgroundColor: pctBg }]}>
                <Text style={[styles.pctText, { color: pctColor }]}>{overallPct}%</Text>
                <Text style={styles.pctLabel}>đã dùng</Text>
              </View>
            </View>

            <Button
              label={showForm ? 'Đóng' : 'Thêm ngân sách mới'}
              icon={showForm ? 'close' : 'add'}
              variant={showForm ? 'secondary' : 'primary'}
              onPress={() => setShowForm((v) => !v)}
              style={{ marginBottom: 12 }}
            />

            {showForm && (
              <View style={styles.form}>
                <Text style={styles.formLabel}>Chọn danh mục</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
                  {categories.map((cat) => {
                    const active = categoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catChip, active && styles.catChipActive]}
                        onPress={() => setCategoryId(cat.id)}
                      >
                        <CategoryIcon icon={cat.icon} name={cat.name} type={cat.type} size={15} color={active ? c.onBrand : c.textSecondary} />
                        <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.formLabel}>Mức ngân sách (VND)</Text>
                <View style={styles.amountRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="Ví dụ: 2,000,000"
                    placeholderTextColor={c.textMuted}
                  />
                  {amount.length > 0 && (
                    <View style={styles.amountPreview}>
                      <Text style={styles.amountPreviewText}>{formatVND(Number(amount))}</Text>
                    </View>
                  )}
                </View>

                <Button label="Tạo ngân sách" icon="savings" onPress={add} loading={saving} />
              </View>
            )}

            {progress.length > 0 && <Text style={styles.sectionTitle}>Theo danh mục</Text>}
          </View>
        }
        renderItem={({ item }) => {
          const meta = getStatusMeta(item.status, c);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.catIcon}>
                    <CategoryIcon icon={item.category_icon} name={item.category_name} type="expense" size={16} color={c.brand} />
                  </View>
                  <Text style={styles.cardTitle}>{item.category_name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <AppIcon name={meta.icon} size={12} color={meta.color} />
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>

              <BudgetProgressBar percentage={item.percentage} spent={item.spent} status={item.status} />

              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>Đã chi: <Text style={{ color: c.expense, fontWeight: '700' }}>{formatVND(item.spent)}</Text></Text>
                <Text style={styles.metaText}>
                  Còn lại: <Text style={{ color: item.remaining < 0 ? c.expense : c.income, fontWeight: '700' }}>{formatVND(item.remaining)}</Text>
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            emoji="💰"
            title="Chưa có ngân sách"
            message="Thêm ngân sách để kiểm soát chi tiêu tốt hơn!"
            actionLabel="Thêm ngân sách"
            actionIcon="add-circle-outline"
            onAction={() => setShowForm(true)}
          />
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  content: { padding: 16, paddingBottom: 32 },

  overviewCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: t.colors.surface, padding: 18, borderRadius: t.radius.xl,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: 12, ...t.shadows.sm,
  },
  periodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: t.colors.brandSoft, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: t.radius.pill, alignSelf: 'flex-start', marginBottom: 10,
  },
  periodText: { fontSize: 12, color: t.colors.brandText, fontWeight: '700' },
  overviewSpent: { fontSize: 26, fontWeight: '900', color: t.colors.expense, marginBottom: 2 },
  overviewTotal: { fontSize: 13, color: t.colors.textMuted, fontWeight: '600' },
  pctCircle: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  pctText: { fontSize: 18, fontWeight: '900' },
  pctLabel: { fontSize: 9, color: t.colors.textMuted, fontWeight: '600' },

  form: {
    backgroundColor: t.colors.surface, padding: 16, borderRadius: t.radius.lg,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: 14, ...t.shadows.sm,
  },
  formLabel: { color: t.colors.textMuted, fontWeight: '700', fontSize: 13, marginBottom: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: t.radius.pill, backgroundColor: t.colors.surfaceAlt, borderWidth: 1.5, borderColor: t.colors.border,
  },
  catChipActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  catChipText: { fontSize: 13, color: t.colors.textSecondary, fontWeight: '600' },
  catChipTextActive: { color: t.colors.onBrand, fontWeight: '700' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  input: {
    borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md,
    padding: 13, fontSize: 15, color: t.colors.text, backgroundColor: t.colors.surfaceAlt,
  },
  amountPreview: { backgroundColor: t.colors.brandSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: t.radius.pill },
  amountPreviewText: { color: t.colors.brandText, fontWeight: '800', fontSize: 13 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: t.colors.text, marginBottom: 12 },

  card: {
    backgroundColor: t.colors.surface, padding: 16, borderRadius: t.radius.lg,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: 10, ...t.shadows.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  catIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: t.colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: t.colors.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: t.radius.pill },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaText: { color: t.colors.textMuted, fontSize: 13 },
});
