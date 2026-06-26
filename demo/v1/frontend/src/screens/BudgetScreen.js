import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { api } from '../services/api.service';
import { COLORS } from '../utils/constants';
import { currentPeriod, formatVND } from '../utils/formatters';
import BudgetProgressBar from '../components/BudgetProgressBar';
import AppIcon from '../components/AppIcon';
import CategoryIcon from '../components/CategoryIcon';

function getStatusMeta(status) {
  if (status === 'exceeded') return { label: 'Vượt mức', color: '#7F1D1D', dot: COLORS.expense };
  if (status === 'danger') return { label: 'Sắp đến', color: '#7F1D1D', dot: '#EA580C' };
  if (status === 'warning') return { label: 'Chú ý', color: '#92400E', dot: '#D97706' };
  return { label: 'Ổn', color: COLORS.income, dot: COLORS.income };
}

function SkeletonBudget() {
  return (
    <View style={{ padding: 14, backgroundColor: COLORS.surface, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border }}>
      <View style={{ width: '40%', height: 14, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 10 }} />
      <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4 }} />
      <View style={{ width: '60%', height: 10, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: 8 }} />
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
      await api.createBudget({
        category_id: categoryId,
        amount_limit: Number(amount),
        month: period.month,
        year: period.year,
      });
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
        <AppIcon name="warning" size={44} color={COLORS.expense} style={styles.stateIcon} />
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
          {/* Period header */}
          <View style={styles.header}>
            <View>
              <View style={styles.periodRow}>
                <AppIcon name="calendar-today" size={18} color={COLORS.primary} />
                <Text style={styles.period}>Tháng {period.month}/{period.year}</Text>
              </View>
              <Text style={styles.overview}>
                Đã chi: <Text style={{ color: COLORS.expense, fontWeight: '800' }}>{formatVND(totalSpent)}</Text>
                {' / '}
                <Text style={{ color: COLORS.text }}>{formatVND(totalBudget)}</Text>
              </Text>
            </View>
            <View style={styles.overallPct}>
              <Text style={[styles.overallPctText, overallPct > 100 ? styles.pctDanger : overallPct > 70 ? styles.pctWarning : styles.pctSafe]}>
                {overallPct}%
              </Text>
            </View>
          </View>

          {/* Add budget toggle */}
          <TouchableOpacity
            style={[styles.toggleForm, showForm && styles.toggleFormActive]}
            onPress={() => setShowForm((v) => !v)}
          >
            <View style={styles.buttonContent}>
              <AppIcon name={showForm ? 'close' : 'add'} size={18} color={showForm ? COLORS.primary : COLORS.muted} />
              <Text style={[styles.toggleFormText, showForm && styles.toggleFormTextActive]}>
                {showForm ? 'Đóng' : 'Thêm ngân sách mới'}
              </Text>
            </View>
          </TouchableOpacity>

          {showForm && (
            <View style={styles.form}>
              <Text style={styles.formLabel}>Chọn danh mục</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, categoryId === cat.id && styles.chipActive]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <View style={styles.chipContent}>
                      <CategoryIcon icon={cat.icon} name={cat.name} type={cat.type} size={16} color={categoryId === cat.id ? '#fff' : COLORS.text} />
                      <Text style={[styles.chipText, categoryId === cat.id && styles.chipActiveText]}>
                        {cat.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Mức ngân sách (VND)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="Ví dụ: 2000000"
                placeholderTextColor={COLORS.muted}
              />
              {amount.length > 0 && (
                <Text style={styles.amountPreview}>≈ {formatVND(Number(amount))}</Text>
              )}
              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={add} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={styles.saveBtnContent}>
                    <AppIcon name="account-balance-wallet" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Tạo ngân sách</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {progress.length > 0 && (
            <Text style={styles.sectionTitle}>Ngân sách theo danh mục</Text>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const statusMeta = getStatusMeta(item.status);
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <CategoryIcon icon={item.category_icon} name={item.category_name} type="expense" size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>{item.category_name}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                item.status === 'exceeded' ? styles.badgeDanger :
                item.status === 'danger'   ? styles.badgeDanger :
                item.status === 'warning'  ? styles.badgeWarning :
                styles.badgeSafe,
              ]}>
                <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
                <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
              </View>
            </View>
            <BudgetProgressBar
              percentage={item.percentage}
              spent={item.spent}
              limit={item.amount_limit}
              status={item.status}
            />
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>Đã chi: {formatVND(item.spent)}</Text>
              <Text style={styles.metaText}>Còn lại: <Text style={{ color: item.remaining < 0 ? COLORS.expense : COLORS.income, fontWeight: '700' }}>{formatVND(item.remaining)}</Text></Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <AppIcon name="lightbulb-outline" size={46} color={COLORS.muted} style={styles.stateIcon} />
          <Text style={styles.emptyTitle}>Chưa có ngân sách nào</Text>
          <Text style={styles.emptyMsg}>Hãy thêm ngân sách để kiểm soát chi tiêu tốt hơn!</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.emptyBtnText}>Thêm ngân sách</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 12,
  },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  period: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  overview: { color: COLORS.muted, marginTop: 4, fontSize: 13 },
  overallPct: { alignItems: 'center' },
  overallPctText: { fontSize: 22, fontWeight: '900' },
  pctSafe: { color: COLORS.income },
  pctWarning: { color: '#D97706' },
  pctDanger: { color: COLORS.expense },

  toggleForm: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12,
    alignItems: 'center', backgroundColor: COLORS.surface, marginBottom: 12,
  },
  toggleFormActive: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleFormText: { color: COLORS.muted, fontWeight: '700' },
  toggleFormTextActive: { color: COLORS.primary },

  form: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  formLabel: { color: COLORS.muted, fontWeight: '700', fontSize: 13, marginBottom: 8 },
  chip: { backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 13, color: COLORS.text },
  chipActiveText: { color: '#fff', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 16, color: COLORS.text, backgroundColor: COLORS.background },
  amountPreview: { color: COLORS.muted, fontSize: 13, marginBottom: 8, textAlign: 'right' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 10 },

  card: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  badgeSafe: { color: COLORS.income, backgroundColor: '#D1FAE5' },
  badgeWarning: { color: '#92400E', backgroundColor: '#FEF3C7' },
  badgeDanger: { color: '#7F1D1D', backgroundColor: '#FEE2E2' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaText: { color: COLORS.muted, fontSize: 13 },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  stateIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 16 },
  emptyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700' },

  errorTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  errorMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
});
