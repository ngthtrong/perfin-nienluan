import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Alert, Modal,
} from 'react-native';
import { api } from '../services/api.service';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';
import { formatVND } from '../utils/formatters';
import AppIcon from '../components/AppIcon';
import CategoryIcon from '../components/CategoryIcon';

const FREQ_OPTIONS = [
  { key: 'weekly', label: 'Hàng tuần' },
  { key: 'monthly', label: 'Hàng tháng' },
  { key: 'quarterly', label: 'Hàng quý' },
  { key: 'yearly', label: 'Hàng năm' },
];

const FREQ_LABEL = Object.fromEntries(FREQ_OPTIONS.map((f) => [f.key, f.label]));

const EMPTY_FORM = { id: null, name: '', amount: '', frequency: 'monthly', due_day: '1', category_id: null };

export default function RecurringScreen() {
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
      id: bill.id,
      name: bill.name,
      amount: String(Number(bill.amount)),
      frequency: bill.frequency,
      due_day: String(bill.due_day),
      category_id: bill.category_id,
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
        name: form.name.trim(),
        amount: Number(form.amount),
        frequency: form.frequency,
        due_day: Number(form.due_day),
        category_id: form.category_id,
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
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    }
  }

  function confirmDelete(bill) {
    Alert.alert(
      'Xóa chi phí cố định',
      `Xóa "${bill.name}"? Nhắc nhở sẽ bị hủy nhưng lịch sử thanh toán đã ghi nhận vẫn được giữ nguyên.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: async () => { await api.deleteRecurringBill(bill.id); await load(); } },
      ],
    );
  }

  async function pay(bill) {
    try {
      await api.payRecurringBill(bill.id);
      await load();
      Alert.alert('Đã ghi nhận', `Đã thanh toán ${formatVND(bill.amount)} cho ${bill.name}.`);
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    }
  }

  async function openHistory(bill) {
    setHistoryBill(bill);
    setHistory(null);
    try {
      const res = await api.getRecurringPayments(bill.id);
      setHistory(res.data);
    } catch (err) {
      setHistory({ payments: [], summary: {} });
    }
  }

  async function acceptSuggestion(s) {
    try {
      await api.createRecurringBill({
        name: s.name,
        amount: s.amount,
        frequency: s.frequency,
        due_day: s.due_day,
        category_id: s.category_id,
        is_variable_amount: s.is_variable_amount,
      });
      await load();
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    }
  }

  async function dismissSuggestion(s) {
    try {
      await api.dismissRecurringSuggestion(s.signature);
      setSuggestions((prev) => prev.filter((x) => x.signature !== s.signature));
    } catch (_) {}
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <AppIcon name="warning-amber" size={28} color={COLORS.expense} />
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <RecurringHeader
            totalMonthly={totalMonthly}
            count={bills.length}
            suggestions={suggestions}
            onAccept={acceptSuggestion}
            onDismiss={dismissSuggestion}
            onCreate={openCreate}
          />
        }
        renderItem={({ item }) => (
          <BillCard
            bill={item}
            onPay={() => pay(item)}
            onEdit={() => openEdit(item)}
            onDelete={() => confirmDelete(item)}
            onTogglePause={() => togglePause(item)}
            onHistory={() => openHistory(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIconText}>🔔</Text>
            <Text style={styles.emptyTitle}>Chưa có chi phí cố định</Text>
            <Text style={styles.emptyMsg}>Thêm các khoản như tiền trọ, điện nước, internet để được nhắc đúng hạn.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openCreate}>
              <AppIcon name="add-circle-outline" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Thêm khoản chi</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <BillFormModal
        visible={showForm}
        form={form}
        setForm={setForm}
        categories={categories}
        saving={saving}
        onSave={save}
        onClose={() => setShowForm(false)}
      />

      <HistoryModal
        bill={historyBill}
        history={history}
        onClose={() => { setHistoryBill(null); setHistory(null); }}
      />
    </View>
  );
}

function RecurringHeader({ totalMonthly, count, suggestions, onAccept, onDismiss, onCreate }) {
  return (
    <View>
      <View style={styles.overviewCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overviewLabel}>Chi phí cố định hàng tháng</Text>
          <Text style={styles.overviewAmount}>{formatVND(totalMonthly)}</Text>
          <Text style={styles.overviewSub}>{count} khoản đang theo dõi</Text>
        </View>
        <View style={styles.overviewIcon}>
          <AppIcon name="event-repeat" size={26} color={COLORS.primary} />
        </View>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          <View style={styles.suggestHeader}>
            <AppIcon name="auto-awesome" size={15} color={COLORS.primary} />
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
                <AppIcon name="close" size={16} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.addToggle} onPress={onCreate} activeOpacity={0.85}>
        <View style={styles.addIcon}><AppIcon name="add" size={18} color="#fff" /></View>
        <Text style={styles.addToggleText}>Thêm chi phí cố định</Text>
        <AppIcon name="chevron-right" size={18} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </View>
  );
}

function BillCard({ bill, onPay, onEdit, onDelete, onTogglePause, onHistory }) {
  const paused = bill.status === 'paused';
  const paid = bill.current_period_status === 'paid';
  return (
    <View style={[styles.card, paused && styles.cardPaused]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={styles.catIcon}>
            <CategoryIcon icon={bill.category_icon || '🔔'} name={bill.category_name} type="expense" size={16} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{bill.name}</Text>
            <Text style={styles.cardSub}>{FREQ_LABEL[bill.frequency]} · kỳ kế {bill.next_due_date}</Text>
          </View>
        </View>
        <Text style={styles.cardAmount}>{formatVND(bill.amount)}</Text>
      </View>

      <View style={styles.badgeRow}>
        {paused
          ? <View style={[styles.badge, { backgroundColor: COLORS.warningLight }]}><Text style={[styles.badgeText, { color: COLORS.warning }]}>Tạm dừng</Text></View>
          : paid
            ? <View style={[styles.badge, { backgroundColor: COLORS.incomeLight }]}><Text style={[styles.badgeText, { color: COLORS.income }]}>Đã thanh toán kỳ này</Text></View>
            : <View style={[styles.badge, { backgroundColor: COLORS.primaryLight }]}><Text style={[styles.badgeText, { color: COLORS.primary }]}>Đang hoạt động</Text></View>}
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
          <AppIcon name="history" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconAction} onPress={onTogglePause}>
          <AppIcon name={paused ? 'play-arrow' : 'pause'} size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconAction} onPress={onEdit}>
          <AppIcon name="edit" size={17} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconAction} onPress={onDelete}>
          <AppIcon name="delete-outline" size={18} color={COLORS.expense} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BillFormModal({ visible, form, setForm, categories, saving, onSave, onClose }) {
  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{form.id ? 'Sửa chi phí cố định' : 'Thêm chi phí cố định'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.formLabel}>Tên khoản chi</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="Ví dụ: Tiền phòng trọ" placeholderTextColor={COLORS.muted} />

            <Text style={styles.formLabel}>Số tiền (VND)</Text>
            <TextInput style={styles.input} value={form.amount} onChangeText={set('amount')} keyboardType="numeric" placeholder="1500000" placeholderTextColor={COLORS.muted} />

            <Text style={styles.formLabel}>Chu kỳ</Text>
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.map((f) => (
                <TouchableOpacity key={f.key} style={[styles.freqChip, form.frequency === f.key && styles.freqChipActive]} onPress={() => set('frequency')(f.key)}>
                  <Text style={[styles.freqChipText, form.frequency === f.key && styles.freqChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>{form.frequency === 'weekly' ? 'Thứ trong tuần (1=T2 .. 7=CN)' : 'Ngày thanh toán (1-31)'}</Text>
            <TextInput style={styles.input} value={form.due_day} onChangeText={set('due_day')} keyboardType="numeric" placeholder={form.frequency === 'weekly' ? '1' : '5'} placeholderTextColor={COLORS.muted} />

            <Text style={styles.formLabel}>Danh mục</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
              {categories.map((cat) => (
                <TouchableOpacity key={cat.id} style={[styles.catChip, form.category_id === cat.id && styles.catChipActive]} onPress={() => set('category_id')(cat.id)}>
                  <CategoryIcon icon={cat.icon} name={cat.name} type="expense" size={14} color={form.category_id === cat.id ? '#fff' : COLORS.textSecondary} />
                  <Text style={[styles.catChipText, form.category_id === cat.id && styles.catChipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelBtnText}>Hủy</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{form.id ? 'Lưu' : 'Tạo'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function HistoryModal({ bill, history, onClose }) {
  if (!bill) return null;
  const summary = history?.summary || {};
  return (
    <Modal visible={!!bill} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Lịch sử: {bill.name}</Text>
          {!history ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
          ) : (
            <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{summary.paid_count || 0}</Text><Text style={styles.summaryLabel}>Đã trả</Text></View>
                <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color: COLORS.expense }]}>{summary.overdue_count || 0}</Text><Text style={styles.summaryLabel}>Quá hạn</Text></View>
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{formatVND(summary.total_paid || 0)}</Text><Text style={styles.summaryLabel}>Tổng đã trả</Text></View>
              </View>
              <FlatList
                data={history.payments}
                keyExtractor={(p) => String(p.id)}
                style={{ maxHeight: 280 }}
                ListEmptyComponent={<Text style={styles.emptyMsg}>Chưa có kỳ thanh toán nào.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.histRow}>
                    <View>
                      <Text style={styles.histDate}>Kỳ {item.period_due_date}</Text>
                      <Text style={styles.histSub}>{item.paid_date ? `Trả ngày ${item.paid_date}` : 'Chưa trả'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.histAmount}>{formatVND(item.amount)}</Text>
                      <Text style={[styles.histStatus, item.status === 'overdue' && { color: COLORS.expense }]}>
                        {item.status === 'paid' ? 'Đã thanh toán' : item.status === 'overdue' ? 'Quá hạn' : 'Chưa thanh toán'}
                      </Text>
                    </View>
                  </View>
                )}
              />
            </>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeBtnText}>Đóng</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },

  overviewCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    padding: 18, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, ...SHADOWS.md,
  },
  overviewLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  overviewAmount: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginVertical: 4 },
  overviewSub: { fontSize: 12, color: COLORS.muted },
  overviewIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },

  suggestBox: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 12, ...SHADOWS.sm },
  suggestHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  suggestTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  suggestItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  suggestName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  suggestMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  suggestAccept: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  suggestDismiss: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },

  addToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.primary, padding: 14, borderRadius: RADIUS.lg, marginBottom: 14, ...SHADOWS.sm },
  addIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  addToggleText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 14 },

  card: { backgroundColor: COLORS.surface, padding: 16, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, ...SHADOWS.sm },
  cardPaused: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  catIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: '900', color: COLORS.expense },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  walletText: { fontSize: 12, color: COLORS.muted },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full },
  payBtn: { backgroundColor: COLORS.income, flex: 1, justifyContent: 'center' },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  iconAction: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },

  emptyState: { alignItems: 'center', paddingVertical: 48, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, marginTop: 8 },
  emptyIconText: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyMsg: { color: COLORS.muted, textAlign: 'center', marginBottom: 20, fontSize: 14, paddingHorizontal: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.full, ...SHADOWS.sm },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  errorMsg: { color: COLORS.muted, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.full },
  retryText: { color: '#fff', fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20, maxHeight: '88%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text, marginBottom: 14 },
  formLabel: { color: COLORS.muted, fontWeight: '700', fontSize: 13, marginBottom: 8, marginTop: 6 },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 13, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.background },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border },
  freqChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  freqChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  freqChipTextActive: { color: '#fff', fontWeight: '700' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.background, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  saveBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.sm },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  summaryItem: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background, paddingVertical: 12, borderRadius: RADIUS.md },
  summaryValue: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  summaryLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  histDate: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  histSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  histAmount: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  histStatus: { fontSize: 11, color: COLORS.income, fontWeight: '700', marginTop: 2 },
  closeBtn: { marginTop: 16, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.background, alignItems: 'center' },
  closeBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
});
