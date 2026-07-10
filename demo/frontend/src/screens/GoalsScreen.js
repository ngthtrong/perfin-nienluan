import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { formatDate, formatVND } from '../utils/formatters';
import AppIcon from '../components/AppIcon';
import {
  Button, Card, EmptyState, ErrorState, ProgressBar, Screen, SegmentedControl, Skeleton,
} from '../components/ui';

const GOAL_TYPES = [
  { value: 'saving', label: 'Tiết kiệm' },
  { value: 'purchase', label: 'Mua sắm' },
  { value: 'debt_payoff', label: 'Trả nợ' },
];

const EMPTY_FORM = {
  name: '',
  goal_type: 'saving',
  target_amount: '',
  current_amount: '0',
  target_date: '',
  monthly_contribution: '',
  annual_interest_rate: '',
  note: '',
};

function statusMeta(status, colors) {
  if (status === 'completed' || status === 'achieved') {
    return { label: 'Hoàn thành', icon: 'check-circle', color: colors.income, bg: colors.incomeSoft };
  }
  if (['off_track', 'behind_schedule', 'overdue', 'deadline_reached'].includes(status)) {
    return { label: 'Chậm tiến độ', icon: 'warning-amber', color: colors.expense, bg: colors.expenseSoft };
  }
  if (status === 'paused') {
    return { label: 'Tạm dừng', icon: 'pause-circle', color: colors.warning, bg: colors.warningSoft };
  }
  return { label: 'Đúng tiến độ', icon: 'trending-up', color: colors.brandText, bg: colors.brandSoft };
}

function goalTypeLabel(value) {
  return GOAL_TYPES.find((option) => option.value === value)?.label || 'Mục tiêu';
}

export default function GoalsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;
  const [goals, setGoals] = useState([]);
  const [surplus, setSurplus] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [planPreview, setPlanPreview] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [goalResponse, surplusResponse] = await Promise.all([
        api.getGoals(),
        api.getGoalSurplus(),
      ]);
      setGoals(goalResponse.data || []);
      setSurplus(surplusResponse.data || null);
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

  function setField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setPlanPreview(null);
  }

  function payloadFromForm() {
    return {
      name: form.name.trim(),
      goal_type: form.goal_type,
      target_amount: Number(form.target_amount),
      current_amount: Number(form.current_amount || 0),
      target_date: form.target_date.trim() || null,
      monthly_contribution: form.monthly_contribution.trim() === ''
        ? null
        : Number(form.monthly_contribution),
      annual_interest_rate: form.goal_type === 'debt_payoff'
        ? Number(form.annual_interest_rate || 0)
        : 0,
      note: form.note.trim() || null,
    };
  }

  function validateForm() {
    if (!form.name.trim()) return 'Vui lòng đặt tên cho mục tiêu.';
    if (!(Number(form.target_amount) > 0)) return 'Số tiền mục tiêu phải lớn hơn 0.';
    if (Number(form.current_amount || 0) < 0) return 'Số tiền hiện có không được âm.';
    if (form.monthly_contribution && Number(form.monthly_contribution) < 0) return 'Khoản góp hàng tháng không được âm.';
    if (form.target_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.target_date)) return 'Ngày đích cần có định dạng YYYY-MM-DD.';
    return null;
  }

  async function previewPlan() {
    const validation = validateForm();
    if (validation) return Alert.alert('Thiếu thông tin', validation);
    setPlanning(true);
    try {
      const response = await api.planGoal(payloadFromForm());
      setPlanPreview(response.data || null);
    } catch (err) {
      Alert.alert('Không thể lập kế hoạch', err.message);
    } finally {
      setPlanning(false);
    }
  }

  async function saveGoal() {
    const validation = validateForm();
    if (validation) return Alert.alert('Thiếu thông tin', validation);
    setSaving(true);
    try {
      const payload = payloadFromForm();
      if (editingId) await api.updateGoal(editingId, payload);
      else await api.createGoal(payload);
      resetForm();
      await load();
    } catch (err) {
      Alert.alert('Không thể lưu mục tiêu', err.message);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setPlanPreview(null);
    setShowForm(false);
  }

  function beginEdit(goal) {
    setEditingId(goal.id);
    setForm({
      name: goal.name || '',
      goal_type: goal.goal_type || 'saving',
      target_amount: String(goal.target_amount || ''),
      current_amount: String(goal.current_amount || 0),
      target_date: goal.target_date ? String(goal.target_date).slice(0, 10) : '',
      monthly_contribution: goal.monthly_contribution == null ? '' : String(goal.monthly_contribution),
      annual_interest_rate: Number(goal.annual_interest_rate || 0) > 0 ? String(goal.annual_interest_rate) : '',
      note: goal.note || '',
    });
    setPlanPreview({ plan: goal.plan, progress: goal.progress, cashflow: goal.cashflow });
    setShowForm(true);
  }

  function requestDelete(goal) {
    Alert.alert(
      'Xóa mục tiêu?',
      `Mục tiêu “${goal.name}” sẽ được chuyển sang trạng thái đã hủy.`,
      [
        { text: 'Giữ lại', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(goal.id);
            try {
              await api.deleteGoal(goal.id);
              if (editingId === goal.id) resetForm();
              await load();
            } catch (err) {
              Alert.alert('Không thể xóa mục tiêu', err.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <Screen scroll edges={[]}>
        <Skeleton height={96} radius={18} style={{ marginBottom: 12 }} />
        <Skeleton height={180} radius={18} style={{ marginBottom: 12 }} />
        <Skeleton height={180} radius={18} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen edges={[]}>
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      edges={[]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
    >
      <Card style={styles.surplusCard} elevated>
        <View style={styles.surplusIcon}>
          <AppIcon name="account-balance" size={22} color={c.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.surplusLabel}>Dòng tiền có thể phân bổ</Text>
          <Text style={[styles.surplusValue, { color: Number(surplus?.surplus || 0) >= 0 ? c.income : c.expense }]}>
            {formatVND(surplus?.surplus || 0)}/tháng
          </Text>
          <Text style={styles.surplusDetail}>
            Thu TB {formatVND(surplus?.avgIncome || 0)} · Chi TB {formatVND(surplus?.avgExpense || 0)}
          </Text>
        </View>
      </Card>

      <Button
        label={showForm ? (editingId ? 'Đóng phần chỉnh sửa' : 'Đóng biểu mẫu') : 'Tạo mục tiêu mới'}
        icon={showForm ? 'close' : 'add'}
        variant={showForm ? 'secondary' : 'primary'}
        onPress={() => { if (showForm) resetForm(); else setShowForm(true); }}
        style={{ marginBottom: 14 }}
      />

      {showForm && (
        <Card style={styles.formCard} elevated>
          <View style={styles.formHeadingRow}>
            <View>
              <Text style={styles.formHeading}>{editingId ? 'Chỉnh sửa mục tiêu' : 'Mục tiêu mới'}</Text>
              <Text style={styles.formSubheading}>Xem thử kế hoạch trước khi lưu</Text>
            </View>
            {editingId && <View style={styles.editBadge}><Text style={styles.editBadgeText}>Đang sửa</Text></View>}
          </View>

          <Text style={styles.label}>Loại mục tiêu</Text>
          <SegmentedControl options={GOAL_TYPES} value={form.goal_type} onChange={(value) => setField('goal_type', value)} />

          <Text style={styles.label}>Tên mục tiêu</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(value) => setField('name', value)}
            placeholder="Ví dụ: Quỹ dự phòng 6 tháng"
            placeholderTextColor={c.textMuted}
          />

          <View style={styles.twoColumns}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Số tiền mục tiêu</Text>
              <TextInput
                style={styles.input}
                value={form.target_amount}
                onChangeText={(value) => setField('target_amount', value)}
                keyboardType="numeric"
                placeholder="300000000"
                placeholderTextColor={c.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Hiện đã có</Text>
              <TextInput
                style={styles.input}
                value={form.current_amount}
                onChangeText={(value) => setField('current_amount', value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={c.textMuted}
              />
            </View>
          </View>

          <Text style={styles.label}>Góp mỗi tháng</Text>
          <TextInput
            style={styles.input}
            value={form.monthly_contribution}
            onChangeText={(value) => setField('monthly_contribution', value)}
            keyboardType="numeric"
            placeholder="Để trống để dùng dòng tiền có thể phân bổ"
            placeholderTextColor={c.textMuted}
          />

          <Text style={styles.label}>Ngày đích (không bắt buộc)</Text>
          <TextInput
            style={styles.input}
            value={form.target_date}
            onChangeText={(value) => setField('target_date', value)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={c.textMuted}
            autoCapitalize="none"
          />

          {form.goal_type === 'debt_payoff' && (
            <>
              <Text style={styles.label}>Lãi suất năm (%)</Text>
              <TextInput
                style={styles.input}
                value={form.annual_interest_rate}
                onChangeText={(value) => setField('annual_interest_rate', value)}
                keyboardType="decimal-pad"
                placeholder="Ví dụ: 12"
                placeholderTextColor={c.textMuted}
              />
            </>
          )}

          <Text style={styles.label}>Ghi chú (không bắt buộc)</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={form.note}
            onChangeText={(value) => setField('note', value)}
            placeholder="Điều gì khiến mục tiêu này quan trọng?"
            placeholderTextColor={c.textMuted}
            multiline
          />

          <Button
            label="Xem kế hoạch"
            icon="calculate"
            variant="secondary"
            onPress={previewPlan}
            loading={planning}
            style={{ marginBottom: 9 }}
          />

          {planPreview?.plan && (
            <PlanPreview data={planPreview} styles={styles} colors={c} />
          )}

          <Button
            label={editingId ? 'Lưu thay đổi' : 'Lưu mục tiêu'}
            icon={editingId ? 'save' : 'flag'}
            onPress={saveGoal}
            loading={saving}
          />
        </Card>
      )}

      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionHeading}>Mục tiêu của bạn</Text>
        <View style={styles.totalBadge}><Text style={styles.totalBadgeText}>{goals.length}</Text></View>
      </View>

      {goals.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="Chưa có mục tiêu"
          message="Tạo một mục tiêu để PERFIN tính khoản góp và theo dõi tiến độ."
          actionLabel="Tạo mục tiêu"
          actionIcon="add-circle-outline"
          onAction={() => setShowForm(true)}
        />
      ) : goals.map((goal) => {
        const status = goal.progress?.status || goal.plan?.status || goal.status;
        const meta = statusMeta(status, c);
        const percent = Number(goal.progress?.actualPercent ?? goal.plan?.progressPercent ?? 0);
        const remaining = Number(goal.progress?.remaining ?? goal.plan?.remaining ?? 0);
        return (
          <Card key={goal.id} style={styles.goalCard} elevated>
            <View style={styles.goalHeader}>
              <View style={[styles.goalIcon, { backgroundColor: meta.bg }]}>
                <AppIcon name={goal.goal_type === 'debt_payoff' ? 'credit-card-off' : goal.goal_type === 'purchase' ? 'shopping-bag' : 'savings'} size={20} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalType}>{goalTypeLabel(goal.goal_type)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                <AppIcon name={meta.icon} size={12} color={meta.color} />
                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>

            <View style={styles.progressHeader}>
              <Text style={styles.progressAmount}>{formatVND(goal.current_amount)}</Text>
              <Text style={styles.progressTarget}>/ {formatVND(goal.target_amount)}</Text>
              <Text style={styles.progressPercent}>{Math.min(100, Math.max(0, percent)).toFixed(0)}%</Text>
            </View>
            <ProgressBar percentage={percent} color={meta.color} />

            <View style={styles.goalStats}>
              <View style={styles.goalStat}>
                <Text style={styles.goalStatLabel}>Còn thiếu</Text>
                <Text style={styles.goalStatValue}>{formatVND(remaining)}</Text>
              </View>
              <View style={styles.goalStat}>
                <Text style={styles.goalStatLabel}>Góp hàng tháng</Text>
                <Text style={styles.goalStatValue}>{formatVND(goal.plan?.contribution ?? goal.plan?.monthlyPayment ?? 0)}</Text>
              </View>
              <View style={styles.goalStat}>
                <Text style={styles.goalStatLabel}>Dự kiến</Text>
                <Text style={styles.goalStatValue} numberOfLines={1}>
                  {goal.plan?.monthsNeeded == null ? 'Chưa xác định' : `${goal.plan.monthsNeeded} tháng`}
                </Text>
              </View>
            </View>

            {(goal.progress?.warning?.message || goal.plan?.warning?.message) && (
              <View style={styles.warningBox}>
                <AppIcon name="info-outline" size={15} color={c.warning} />
                <Text style={styles.warningText}>{goal.progress?.warning?.message || goal.plan?.warning?.message}</Text>
              </View>
            )}

            {goal.target_date && (
              <Text style={styles.deadline}>Hạn: {formatDate(goal.target_date)}</Text>
            )}

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.editButton} onPress={() => beginEdit(goal)}>
                <AppIcon name="edit" size={15} color={c.brandText} />
                <Text style={styles.editButtonText}>Chỉnh sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => requestDelete(goal)} disabled={deletingId === goal.id}>
                <AppIcon name="delete-outline" size={16} color={c.expense} />
                <Text style={styles.deleteButtonText}>{deletingId === goal.id ? 'Đang xóa' : 'Xóa'}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

function PlanPreview({ data, styles, colors }) {
  const plan = data.plan || {};
  const warning = data.progress?.warning || plan.warning;
  return (
    <View style={styles.planBox}>
      <View style={styles.planTitleRow}>
        <AppIcon name="auto-graph" size={17} color={colors.brandText} />
        <Text style={styles.planTitle}>Kế hoạch dự kiến</Text>
      </View>
      <View style={styles.planGrid}>
        <View style={styles.planStat}>
          <Text style={styles.planStatLabel}>Góp/tháng</Text>
          <Text style={styles.planStatValue}>{formatVND(plan.contribution ?? plan.monthlyPayment ?? 0)}</Text>
        </View>
        <View style={styles.planStat}>
          <Text style={styles.planStatLabel}>Thời gian</Text>
          <Text style={styles.planStatValue}>{plan.monthsNeeded == null ? 'Chưa xác định' : `${plan.monthsNeeded} tháng`}</Text>
        </View>
        <View style={styles.planStat}>
          <Text style={styles.planStatLabel}>Ngày dự kiến</Text>
          <Text style={styles.planStatValue}>{plan.projectedDate ? formatDate(plan.projectedDate) : '—'}</Text>
        </View>
        {plan.requiredMonthly != null && (
          <View style={styles.planStat}>
            <Text style={styles.planStatLabel}>Cần để kịp hạn</Text>
            <Text style={styles.planStatValue}>{formatVND(plan.requiredMonthly)}</Text>
          </View>
        )}
      </View>
      {warning?.message && (
        <View style={styles.warningBox}>
          <AppIcon name="warning-amber" size={15} color={colors.warning} />
          <Text style={styles.warningText}>{warning.message}</Text>
        </View>
      )}
      {plan.whatIf?.monthsSaved > 0 && (
        <Text style={styles.whatIfText}>
          Nếu góp thêm {formatVND(plan.whatIf.extraMonthly)}/tháng, bạn có thể rút ngắn khoảng {plan.whatIf.monthsSaved} tháng.
        </Text>
      )}
    </View>
  );
}

const createStyles = (t) => StyleSheet.create({
  surplusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  surplusIcon: {
    width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.colors.brandSoft,
  },
  surplusLabel: { color: t.colors.textMuted, fontSize: 12, fontWeight: '700' },
  surplusValue: { fontSize: 20, fontWeight: '900', marginTop: 2 },
  surplusDetail: { color: t.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 3 },
  formCard: { marginBottom: 22 },
  formHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  formHeading: { color: t.colors.text, fontSize: 18, fontWeight: '900' },
  formSubheading: { color: t.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  editBadge: { backgroundColor: t.colors.brandSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: t.radius.pill },
  editBadgeText: { color: t.colors.brandText, fontSize: 11, fontWeight: '800' },
  label: { color: t.colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 13, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md,
    paddingHorizontal: 12, paddingVertical: 11, color: t.colors.text,
    backgroundColor: t.colors.surfaceAlt, fontSize: 14,
  },
  noteInput: { minHeight: 76, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', gap: 10 },
  planBox: {
    marginBottom: 10, padding: 13, backgroundColor: t.colors.brandSoft,
    borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.brand,
  },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  planTitle: { color: t.colors.brandText, fontSize: 13, fontWeight: '900' },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planStat: { width: '47%' },
  planStatLabel: { color: t.colors.textMuted, fontSize: 10, fontWeight: '700' },
  planStatValue: { color: t.colors.text, fontSize: 12, fontWeight: '800', marginTop: 2 },
  whatIfText: { color: t.colors.brandText, fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 9 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  sectionHeading: { color: t.colors.text, fontSize: 17, fontWeight: '900' },
  totalBadge: {
    minWidth: 25, height: 25, paddingHorizontal: 7, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.brandSoft,
  },
  totalBadgeText: { color: t.colors.brandText, fontSize: 11, fontWeight: '900' },
  goalCard: { marginBottom: 11 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  goalIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  goalName: { color: t.colors.text, fontSize: 15, fontWeight: '900' },
  goalType: { color: t.colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: t.radius.pill },
  statusText: { fontSize: 10, fontWeight: '800' },
  progressHeader: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  progressAmount: { color: t.colors.text, fontSize: 16, fontWeight: '900' },
  progressTarget: { flex: 1, color: t.colors.textMuted, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  progressPercent: { color: t.colors.brandText, fontSize: 13, fontWeight: '900' },
  goalStats: {
    flexDirection: 'row', marginTop: 12, paddingVertical: 10,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.colors.border,
  },
  goalStat: { flex: 1, paddingHorizontal: 4 },
  goalStatLabel: { color: t.colors.textMuted, fontSize: 9, fontWeight: '700', marginBottom: 3 },
  goalStatValue: { color: t.colors.textSecondary, fontSize: 10, fontWeight: '800' },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10,
    padding: 9, borderRadius: t.radius.sm, backgroundColor: t.colors.warningSoft,
  },
  warningText: { flex: 1, color: t.colors.warning, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  deadline: { color: t.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 9 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: t.radius.sm, backgroundColor: t.colors.brandSoft,
  },
  editButtonText: { color: t.colors.brandText, fontSize: 12, fontWeight: '800' },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingHorizontal: 13, borderRadius: t.radius.sm, backgroundColor: t.colors.expenseSoft,
  },
  deleteButtonText: { color: t.colors.expense, fontSize: 12, fontWeight: '800' },
});
