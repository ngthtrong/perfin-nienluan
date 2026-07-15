import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Alert, Modal,
} from 'react-native';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { formatVND } from '../utils/formatters';
import AppIcon from '../components/AppIcon';
import CategoryIcon from '../components/CategoryIcon';
import { Button, EmptyState, ErrorState } from '../components/ui';

const FREQ_OPTIONS = [
  { key: 'weekly', label: 'Hàng tuần' },
  { key: 'monthly', label: 'Hàng tháng' },
  { key: 'quarterly', label: 'Hàng quý' },
  { key: 'yearly', label: 'Hàng năm' },
];
const FREQ_LABEL = Object.fromEntries(FREQ_OPTIONS.map((f) => [f.key, f.label]));
const EMPTY_FORM = { id: null, name: '', amount: '', frequency: 'monthly', due_day: '1', category_id: null };

export default function RecurringScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const [bills, setBills] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [historyBill, setHistoryBill] = useState(null);
  const [history, setHistory] = useState(null);

  const load = useCallback(async () => {
    try {
      const [billsRes, sugRes, catRes] = await Promise.all([
        api.getRecurringBills(),
        api.getRecurringSuggestions(),
        api.getCategories('expense'),
      ]);
      setBills(billsRes.data || []);
      setSuggestions(sugRes.data || []);
      setCategories(catRes.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function openCreate() {
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id || null });
    setShowForm(true);
  }

  function openEdit(bill) {
    setForm({
      id: bill.id, name: bill.name, amount: String(Number(bill.amount)),
      frequency: bill.frequency, due_day: String(bill.due_day), category_id: bill.category_id,
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim() || !form.amount || Number(form.amount) <= 0 || !form.due_day) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên, số tiền dương và ngày thanh toán.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), amount: Number(form.amount), frequency: form.frequency,
        due_day: Number(form.due_day), category_id: form.category_id,
      };
      if (form.id) await api.updateRecurringBill(form.id, payload);
      else await api.createRecurringBill(payload);
      setShowForm(false);
      await load();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu chi phí cố định');
    } finally {
      setSaving(false);
    }
  }

  async function togglePause(bill) {
    try {
      if (bill.status === 'paused') await api.resumeRecurringBill(bill.id);
      else await api.pauseRecurringBill(bill.id);
      await load();
    } catch (err) { Alert.alert('Lỗi', err.message); }
  }

  function confirmDelete(bill) {
    Alert.alert('Xóa chi phí cố định', `Xóa "${bill.name}"? Nhắc nhở sẽ bị hủy nhưng lịch sử thanh toán đã ghi nhận vẫn được giữ nguyên.`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { await api.deleteRecurringBill(bill.id); await load(); } },
    ]);
  }

  async function pay(bill) {
    try {
      await api.payRecurringBill(bill.id, { period_due_date: bill.next_due_date });
      await load();
      Alert.alert('Đã ghi nhận', `Đã thanh toán ${formatVND(bill.amount)} cho ${bill.name}.`);
    } catch (err) { Alert.alert('Lỗi', err.message); }
  }

  async function openHistory(bill) {
    setHistoryBill(bill);
    setHistory(null);
    try { const res = await api.getRecurringPayments(bill.id); setHistory(res.data); }
    catch (err) { setHistory({ payments: [], summary: {} }); }
  }

  async function acceptSuggestion(s) {
    try {
      await api.createRecurringBill({
        name: s.name, amount: s.amount, frequency: s.frequency,
        due_day: s.due_day, category_id: s.category_id, is_variable_amount: s.is_variable_amount,
      });
      await load();
    } catch (err) { Alert.alert('Lỗi', err.message); }
  }

  async function dismissSuggestion(s) {
    try {
      await api.dismissRecurringSuggestion(s.signature);
      setSuggestions((prev) => prev.filter((x) => x.signature !== s.signature));
    } catch (_) {}
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={c.brand} size="large" /></View>;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />;
  }

  const totalMonthly = bills
    .filter((b) => b.status === 'active' && b.frequency === 'monthly')
    .reduce((s, b) => s + Number(b.amount), 0);

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={bills}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
        ListHeaderComponent={
          <RecurringHeader
            styles={styles} c={c}
            totalMonthly={totalMonthly} count={bills.length} suggestions={suggestions}
            onAccept={acceptSuggestion} onDismiss={dismissSuggestion} onCreate={openCreate}
          />
        }
        renderItem={({ item }) => (
          <BillCard
            styles={styles} c={c} bill={item}
            onPay={() => pay(item)} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)}
            onTogglePause={() => togglePause(item)} onHistory={() => openHistory(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="🔔"
            title="Chưa có chi phí cố định"
            message="Thêm các khoản như tiền trọ, điện nước, internet để được nhắc đúng hạn."
            actionLabel="Thêm khoản chi"
            actionIcon="add-circle-outline"
            onAction={openCreate}
          />
        }
      />

      <BillFormModal
        styles={styles} c={c}
        visible={showForm} form={form} setForm={setForm} categories={categories}
        saving={saving} onSave={save} onClose={() => setShowForm(false)}
      />
      <HistoryModal
        styles={styles} c={c}
        bill={historyBill} history={history} onClose={() => { setHistoryBill(null); setHistory(null); }}
      />
    </View>
  );
}

function RecurringHeader({ styles, c, totalMonthly, count, suggestions, onAccept, onDismiss, onCreate }) {
  return (
    <View>
      <View style={styles.overviewCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overviewLabel}>Chi phí cố định hàng tháng</Text>
          <Text style={styles.overviewAmount}>{formatVND(totalMonthly)}</Text>
          <Text style={styles.overviewSub}>{count} khoản đang theo dõi</Text>
        </View>
        <View style={styles.overviewIcon}>
          <AppIcon name="event-repeat" size={26} color={c.brand} />
        </View>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          <View style={styles.suggestHeader}>
            <AppIcon name="auto-awesome" size={15} color={c.brandText} />
            <Text style={styles.suggestTitle}>AI gợi ý từ lịch sử chi tiêu</Text>
          </View>
          {suggestions.map((s) => (
            <View key={s.signature} style={styles.suggestItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestName}>{s.name}</Text>
                <Text style={styles.suggestMeta}>
                  ~{formatVND(s.amount)} · {FREQ_LABEL[s.frequency]} · {s.occurrences} lần
                  {s.is_variable_amount ? ' · số tiền thay đổi' : ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.suggestAccept} onPress={() => onAccept(s)}>
                <AppIcon name="add" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestDismiss} onPress={() => onDismiss(s)}>
                <AppIcon name="close" size={16} color={c.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Button label="Thêm chi phí cố định" icon="add" trailingIcon="chevron-right" onPress={onCreate} style={{ marginBottom: 14 }} />
    </View>
  );
}

function BillCard({ styles, c, bill, onPay, onEdit, onDelete, onTogglePause, onHistory }) {
  const paused = bill.status === 'paused';
  const paid = bill.current_period_status === 'paid';
  const badge = paused
    ? { bg: c.warningSoft, color: c.warning, text: 'Tạm dừng' }
    : paid
      ? { bg: c.incomeSoft, color: c.income, text: 'Đã thanh toán kỳ này' }
      : { bg: c.brandSoft, color: c.brandText, text: 'Đang hoạt động' };

  return (
    <View style={[styles.card, paused && styles.cardPaused]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={styles.catIcon}>
            <CategoryIcon icon={bill.category_icon || '🔔'} name={bill.category_name} type="expense" size={16} color={c.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{bill.name}</Text>
            <Text style={styles.cardSub}>{FREQ_LABEL[bill.frequency]} · kỳ kế {bill.next_due_date}</Text>
          </View>
        </View>
        <Text style={styles.cardAmount}>{formatVND(bill.amount)}</Text>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
        </View>
        {bill.wallet_name && <Text style={styles.walletText}>Ví: {bill.wallet_name}</Text>}
      </View>

      <View style={styles.actionRow}>
        {!paused && !paid && (
          <TouchableOpacity style={[styles.actionBtn, styles.payBtn]} onPress={onPay}>
            <AppIcon name="check" size={15} color="#fff" />
            <Text style={styles.payBtnText}>Đã trả</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.iconAction} onPress={onHistory}>
          <AppIcon name="history" size={18} color={c.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconAction} onPress={onTogglePause}>
          <AppIcon name={paused ? 'play-arrow' : 'pause'} size={18} color={c.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconAction} onPress={onEdit}>
          <AppIcon name="edit" size={17} color={c.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconAction} onPress={onDelete}>
          <AppIcon name="delete-outline" size={18} color={c.expense} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BillFormModal({ styles, c, visible, form, setForm, categories, saving, onSave, onClose }) {
  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{form.id ? 'Sửa chi phí cố định' : 'Thêm chi phí cố định'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.formLabel}>Tên khoản chi</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="Ví dụ: Tiền phòng trọ" placeholderTextColor={c.textMuted} />

            <Text style={styles.formLabel}>Số tiền (VND)</Text>
            <TextInput style={styles.input} value={form.amount} onChangeText={set('amount')} keyboardType="numeric" placeholder="1500000" placeholderTextColor={c.textMuted} />

            <Text style={styles.formLabel}>Chu kỳ</Text>
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.map((f) => {
                const active = form.frequency === f.key;
                return (
                  <TouchableOpacity key={f.key} style={[styles.freqChip, active && styles.freqChipActive]} onPress={() => set('frequency')(f.key)}>
                    <Text style={[styles.freqChipText, active && styles.freqChipTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.formLabel}>{form.frequency === 'weekly' ? 'Thứ trong tuần (1=T2 .. 7=CN)' : 'Ngày thanh toán (1-31)'}</Text>
            <TextInput style={styles.input} value={form.due_day} onChangeText={set('due_day')} keyboardType="numeric" placeholder={form.frequency === 'weekly' ? '1' : '5'} placeholderTextColor={c.textMuted} />

            <Text style={styles.formLabel}>Danh mục</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
              {categories.map((cat) => {
                const active = form.category_id === cat.id;
                return (
                  <TouchableOpacity key={cat.id} style={[styles.catChip, active && styles.catChipActive]} onPress={() => set('category_id')(cat.id)}>
                    <CategoryIcon icon={cat.icon} name={cat.name} type="expense" size={14} color={active ? c.onBrand : c.textSecondary} />
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button label="Hủy" variant="secondary" onPress={onClose} style={{ flex: 1 }} fullWidth={false} />
            <Button label={form.id ? 'Lưu' : 'Tạo'} onPress={onSave} loading={saving} style={{ flex: 1 }} fullWidth={false} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function HistoryModal({ styles, c, bill, history, onClose }) {
  if (!bill) return null;
  const summary = history?.summary || {};
  return (
    <Modal visible={!!bill} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Lịch sử: {bill.name}</Text>
          {!history ? (
            <ActivityIndicator color={c.brand} style={{ marginVertical: 24 }} />
          ) : (
            <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{summary.paid_count || 0}</Text><Text style={styles.summaryLabel}>Đã trả</Text></View>
                <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color: c.expense }]}>{summary.overdue_count || 0}</Text><Text style={styles.summaryLabel}>Quá hạn</Text></View>
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{formatVND(summary.total_paid || 0)}</Text><Text style={styles.summaryLabel}>Tổng đã trả</Text></View>
              </View>
              <FlatList
                data={history.payments}
                keyExtractor={(p) => String(p.id)}
                style={{ maxHeight: 280 }}
                ListEmptyComponent={<Text style={styles.emptyMsgInline}>Chưa có kỳ thanh toán nào.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.histRow}>
                    <View>
                      <Text style={styles.histDate}>Kỳ {item.period_due_date}</Text>
                      <Text style={styles.histSub}>{item.paid_date ? `Trả ngày ${item.paid_date}` : 'Chưa trả'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.histAmount}>{formatVND(item.amount)}</Text>
                      <Text style={[styles.histStatus, item.status === 'overdue' && { color: c.expense }]}>
                        {item.status === 'paid' ? 'Đã thanh toán' : item.status === 'overdue' ? 'Quá hạn' : 'Chưa thanh toán'}
                      </Text>
                    </View>
                  </View>
                )}
              />
            </>
          )}
          <Button label="Đóng" variant="secondary" onPress={onClose} style={{ marginTop: 16 }} />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: t.colors.bg },

  overviewCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: t.colors.surface,
    padding: 18, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, marginBottom: 12, ...t.shadows.sm,
  },
  overviewLabel: { fontSize: 12, color: t.colors.textMuted, fontWeight: '600' },
  overviewAmount: { fontSize: 26, fontWeight: '900', color: t.colors.text, marginVertical: 4 },
  overviewSub: { fontSize: 12, color: t.colors.textMuted },
  overviewIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: t.colors.brandSoft, alignItems: 'center', justifyContent: 'center' },

  suggestBox: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: 14, marginBottom: 12, ...t.shadows.sm },
  suggestHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  suggestTitle: { fontSize: 13, fontWeight: '800', color: t.colors.text },
  suggestItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.colors.border },
  suggestName: { fontSize: 14, fontWeight: '700', color: t.colors.text },
  suggestMeta: { fontSize: 12, color: t.colors.textMuted, marginTop: 2 },
  suggestAccept: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.brand, alignItems: 'center', justifyContent: 'center' },
  suggestDismiss: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },

  card: { backgroundColor: t.colors.surface, padding: 16, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, marginBottom: 10, ...t.shadows.sm },
  cardPaused: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  catIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: t.colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: t.colors.text },
  cardSub: { fontSize: 12, color: t.colors.textMuted, marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: '900', color: t.colors.expense },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
  walletText: { fontSize: 12, color: t.colors.textMuted },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: t.radius.pill },
  payBtn: { backgroundColor: t.colors.income, flex: 1, justifyContent: 'center' },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  iconAction: { width: 38, height: 38, borderRadius: 12, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },

  emptyMsgInline: { color: t.colors.textMuted, textAlign: 'center', paddingVertical: 16 },

  modalBackdrop: { flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: t.colors.surface, borderTopLeftRadius: t.radius.xl, borderTopRightRadius: t.radius.xl, padding: 20, maxHeight: '88%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: t.colors.text, marginBottom: 14 },
  formLabel: { color: t.colors.textMuted, fontWeight: '700', fontSize: 13, marginBottom: 8, marginTop: 6 },
  input: { borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md, padding: 13, fontSize: 15, color: t.colors.text, backgroundColor: t.colors.surfaceAlt },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.surfaceAlt, borderWidth: 1.5, borderColor: t.colors.border },
  freqChipActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  freqChipText: { fontSize: 13, color: t.colors.textSecondary, fontWeight: '600' },
  freqChipTextActive: { color: t.colors.onBrand, fontWeight: '700' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.surfaceAlt, borderWidth: 1.5, borderColor: t.colors.border },
  catChipActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  catChipText: { fontSize: 13, color: t.colors.textSecondary, fontWeight: '600' },
  catChipTextActive: { color: t.colors.onBrand, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  summaryItem: { flex: 1, alignItems: 'center', backgroundColor: t.colors.surfaceAlt, paddingVertical: 12, borderRadius: t.radius.md },
  summaryValue: { fontSize: 15, fontWeight: '900', color: t.colors.text },
  summaryLabel: { fontSize: 11, color: t.colors.textMuted, marginTop: 2 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.colors.border },
  histDate: { fontSize: 14, fontWeight: '700', color: t.colors.text },
  histSub: { fontSize: 12, color: t.colors.textMuted, marginTop: 2 },
  histAmount: { fontSize: 14, fontWeight: '800', color: t.colors.text },
  histStatus: { fontSize: 11, color: t.colors.income, fontWeight: '700', marginTop: 2 },
});
