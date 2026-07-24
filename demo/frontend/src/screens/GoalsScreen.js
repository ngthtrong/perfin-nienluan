import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import {
  formatDate, formatMoneyValue, formatVND, parseMoneyInput,
} from '../utils/formatters';
import { showAlert } from '../utils/alerts';
import AppIcon from '../components/AppIcon';
import {
  Button, Card, Chip, DatePickerField, EmptyState, ErrorState, MoneyInput, ProgressBar, Screen,
  SegmentedControl, Skeleton,
} from '../components/ui';

const GOAL_TYPES = [
  { value: 'saving', label: 'Tiết kiệm' },
  { value: 'purchase', label: 'Mua sắm' },
  { value: 'debt_payoff', label: 'Trả nợ' },
];

const GOAL_TYPE_FILTERS = [{ value: 'all', label: 'Tất cả' }, ...GOAL_TYPES];
const GOAL_PROGRESS_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'on_track', label: 'Đúng tiến độ' },
  { value: 'delayed', label: 'Chậm tiến độ' },
  { value: 'needs_contribution', label: 'Thiếu khoản góp' },
  { value: 'infeasible', label: 'Chưa khả thi' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'paused', label: 'Tạm dừng' },
];

const DELAYED_GOAL_STATUSES = new Set(['off_track', 'behind_schedule', 'overdue', 'deadline_reached']);

function goalProgressFilterKey(status) {
  if (['completed', 'achieved'].includes(status)) return 'completed';
  if (['no_contribution', 'no_payment'].includes(status)) return 'needs_contribution';
  if (['negative_amortization', 'horizon_exceeded'].includes(status)) return 'infeasible';
  if (DELAYED_GOAL_STATUSES.has(status)) return 'delayed';
  if (status === 'paused') return 'paused';
  return 'on_track';
}

function goalProgressStatus(goal) {
  return goal.progress?.status || goal.plan?.status || goal.status;
}

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
  if (status === 'no_contribution') {
    return { label: 'Chưa có khoản góp', icon: 'money-off', color: colors.warning, bg: colors.warningSoft };
  }
  if (status === 'no_payment') {
    return { label: 'Chưa có khoản trả', icon: 'money-off', color: colors.expense, bg: colors.expenseSoft };
  }
  if (status === 'negative_amortization') {
    return { label: 'Nợ không giảm', icon: 'trending-up', color: colors.expense, bg: colors.expenseSoft };
  }
  if (status === 'horizon_exceeded') {
    return { label: 'Chưa khả thi', icon: 'error-outline', color: colors.expense, bg: colors.expenseSoft };
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

function payloadFingerprint(payload) {
  return JSON.stringify(payload);
}

function whatIfMessage(scenario) {
  if (!scenario || !(Number(scenario.extraMonthly) > 0)) return null;
  const prefix = `Nếu góp thêm ${formatVND(scenario.extraMonthly)}/tháng`;
  const horizon = Number.isInteger(scenario.newMonthsNeeded)
    ? `${scenario.newMonthsNeeded} tháng${scenario.newProjectedDate ? ` (khoảng ${formatDate(scenario.newProjectedDate)})` : ''}`
    : null;

  if (scenario.becomesFeasible && horizon) {
    return `${prefix}, kế hoạch sẽ trở nên khả thi với thời gian dự kiến ${horizon}.`;
  }
  if (Number(scenario.monthsSaved) > 0) {
    return `${prefix}, bạn có thể rút ngắn khoảng ${scenario.monthsSaved} tháng${horizon ? `, còn ${horizon}` : ''}.`;
  }
  if (horizon) return `${prefix}, thời gian dự kiến mới là ${horizon}.`;
  return null;
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
  const [planPreviewFingerprint, setPlanPreviewFingerprint] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [goalSearch, setGoalSearch] = useState('');
  const [goalStatusFilter, setGoalStatusFilter] = useState('all');
  const [goalTypeFilter, setGoalTypeFilter] = useState('all');

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
    setPlanPreviewFingerprint(null);
  }

  function payloadFromForm() {
    return {
      name: form.name.trim(),
      goal_type: form.goal_type,
      target_amount: parseMoneyInput(form.target_amount),
      current_amount: parseMoneyInput(form.current_amount || 0),
      target_date: form.target_date.trim() || null,
      monthly_contribution: form.monthly_contribution.trim() === ''
        ? null
        : parseMoneyInput(form.monthly_contribution),
      annual_interest_rate: form.goal_type === 'debt_payoff'
        ? Number(form.annual_interest_rate || 0)
        : 0,
      note: form.note.trim() || null,
    };
  }

  function validateForm() {
    if (!form.name.trim()) return 'Vui lòng đặt tên cho mục tiêu.';
    if (!(parseMoneyInput(form.target_amount) > 0)) return 'Số tiền mục tiêu phải lớn hơn 0.';
    if (parseMoneyInput(form.current_amount || 0) < 0) return 'Số tiền hiện có không được âm.';
    if (form.monthly_contribution && parseMoneyInput(form.monthly_contribution) < 0) return 'Khoản góp hàng tháng không được âm.';
    if (form.target_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.target_date)) return 'Ngày đích cần có định dạng YYYY-MM-DD.';
    return null;
  }

  async function previewPlan() {
    const validation = validateForm();
    if (validation) return showAlert('Thiếu thông tin', validation);
    const payload = payloadFromForm();
    const fingerprint = payloadFingerprint(payload);
    setPlanning(true);
    try {
      const response = await api.planGoal(payload);
      setPlanPreview(response.data || null);
      setPlanPreviewFingerprint(fingerprint);
    } catch (err) {
      setPlanPreview(null);
      setPlanPreviewFingerprint(null);
      showAlert('Không thể lập kế hoạch', err.message);
    } finally {
      setPlanning(false);
    }
  }

  async function saveGoal() {
    const validation = validateForm();
    if (validation) return showAlert('Thiếu thông tin', validation);
    const payload = payloadFromForm();
    if (!planPreview?.plan || planPreviewFingerprint !== payloadFingerprint(payload)) {
      return showAlert('Cần xem kế hoạch', 'Hãy xem lại kế hoạch cho đúng dữ liệu hiện tại trước khi lưu mục tiêu.');
    }
    setSaving(true);
    try {
      const confirmedPayload = { ...payload, preview_token: planPreview.preview_token };
      if (editingId) await api.updateGoal(editingId, confirmedPayload);
      else await api.createGoal(confirmedPayload);
      resetForm();
      await load();
    } catch (err) {
      showAlert('Không thể lưu mục tiêu', err.message);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setPlanPreview(null);
    setPlanPreviewFingerprint(null);
    setShowForm(false);
  }

  function beginEdit(goal) {
    setEditingId(goal.id);
    setForm({
      name: goal.name || '',
      goal_type: goal.goal_type || 'saving',
      target_amount: formatMoneyValue(goal.target_amount),
      current_amount: formatMoneyValue(goal.current_amount ?? 0),
      target_date: goal.target_date ? String(goal.target_date).slice(0, 10) : '',
      monthly_contribution: goal.monthly_contribution == null ? '' : formatMoneyValue(goal.monthly_contribution),
      annual_interest_rate: Number(goal.annual_interest_rate || 0) > 0 ? String(goal.annual_interest_rate) : '',
      note: goal.note || '',
    });
    setPlanPreview(null);
    setPlanPreviewFingerprint(null);
    setShowForm(true);
  }

  function requestDelete(goal) {
    showAlert(
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
              showAlert('Không thể xóa mục tiêu', err.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  function resetGoalFilters() {
    setGoalSearch('');
    setGoalStatusFilter('all');
    setGoalTypeFilter('all');
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

  const planPreviewIsCurrent = Boolean(
    planPreview?.plan
    && planPreviewFingerprint === payloadFingerprint(payloadFromForm())
  );
  const normalizedGoalSearch = goalSearch.trim().toLocaleLowerCase('vi-VN');
  const goalFiltersActive = Boolean(
    normalizedGoalSearch || goalStatusFilter !== 'all' || goalTypeFilter !== 'all'
  );
  const filteredGoals = goals.filter((goal) => {
    if (normalizedGoalSearch
      && !String(goal.name || '').toLocaleLowerCase('vi-VN').includes(normalizedGoalSearch)) return false;
    if (goalTypeFilter !== 'all' && goal.goal_type !== goalTypeFilter) return false;
    return goalStatusFilter === 'all'
      || goalProgressFilterKey(goalProgressStatus(goal)) === goalStatusFilter;
  });

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
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.surplusValue, { color: Number(surplus?.surplus || 0) >= 0 ? c.income : c.expense }]}>
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
            <View style={styles.fieldColumn}>
              <Text style={styles.label}>Số tiền mục tiêu</Text>
              <MoneyInput
                style={styles.input}
                value={form.target_amount}
                onChangeText={(value) => setField('target_amount', value)}
                placeholder="300,000,000"
                placeholderTextColor={c.textMuted}
              />
            </View>
            <View style={styles.fieldColumn}>
              <Text style={styles.label}>Hiện đã có</Text>
              <MoneyInput
                style={styles.input}
                value={form.current_amount}
                onChangeText={(value) => setField('current_amount', value)}
                placeholder="0"
                placeholderTextColor={c.textMuted}
              />
            </View>
          </View>

          <Text style={styles.label}>Góp mỗi tháng</Text>
          <MoneyInput
            style={styles.input}
            value={form.monthly_contribution}
            onChangeText={(value) => setField('monthly_contribution', value)}
            placeholder="Để trống để dùng dòng tiền có thể phân bổ"
            placeholderTextColor={c.textMuted}
          />

          <Text style={styles.label}>Ngày đích (không bắt buộc)</Text>
          <DatePickerField
            value={form.target_date}
            onChange={(value) => setField('target_date', value)}
            minimumDate={new Date()}
            placeholder="Chọn ngày đích"
            accessibilityLabel="Chọn ngày đích"
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

          {planPreviewIsCurrent && (
            <PlanPreview data={planPreview} styles={styles} colors={c} />
          )}

          {!planPreviewIsCurrent && (
            <View style={styles.previewRequired}>
              <AppIcon name="info-outline" size={15} color={c.brandText} />
              <Text style={styles.previewRequiredText}>Xem kế hoạch với dữ liệu hiện tại để mở nút lưu.</Text>
            </View>
          )}

          <Button
            label={editingId ? 'Lưu thay đổi' : 'Lưu mục tiêu'}
            icon={editingId ? 'save' : 'flag'}
            onPress={saveGoal}
            loading={saving}
            disabled={!planPreviewIsCurrent}
          />
        </Card>
      )}

      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionHeading}>Mục tiêu của bạn</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>
            {goalFiltersActive ? `${filteredGoals.length}/${goals.length}` : goals.length}
          </Text>
        </View>
      </View>

      {goals.length > 0 && (
        <View style={styles.filterPanel}>
          <View style={styles.filterHeadingRow}>
            <View style={styles.filterIcon}>
              <AppIcon name="tune" size={18} color={c.brand} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.filterTitle}>Lọc mục tiêu</Text>
              <Text style={styles.filterSummary}>Hiển thị {filteredGoals.length} / {goals.length} mục tiêu</Text>
            </View>
            {goalFiltersActive && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Đặt lại bộ lọc mục tiêu"
                onPress={resetGoalFilters}
                style={styles.resetFilterButton}
              >
                <AppIcon name="restart-alt" size={15} color={c.brandText} />
                <Text style={styles.resetFilterText}>Đặt lại</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchWrapper}>
            <AppIcon name="search" size={18} color={c.textMuted} />
            <TextInput
              accessibilityLabel="Tìm mục tiêu theo tên"
              style={styles.searchInput}
              placeholder="Tìm theo tên mục tiêu..."
              placeholderTextColor={c.textMuted}
              value={goalSearch}
              onChangeText={setGoalSearch}
              returnKeyType="search"
            />
            {goalSearch.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Xóa từ khóa tìm mục tiêu"
                onPress={() => setGoalSearch('')}
              >
                <AppIcon name="close" size={17} color={c.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.filterLabel}>Trạng thái tiến độ</Text>
          <View style={styles.filterRow}>
            {GOAL_PROGRESS_FILTERS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                active={goalStatusFilter === option.value}
                onPress={() => setGoalStatusFilter(option.value)}
              />
            ))}
          </View>

          <Text style={styles.filterLabel}>Loại mục tiêu</Text>
          <View style={[styles.filterRow, styles.filterRowLast]}>
            {GOAL_TYPE_FILTERS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                active={goalTypeFilter === option.value}
                onPress={() => setGoalTypeFilter(option.value)}
              />
            ))}
          </View>
        </View>
      )}

      {goals.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="Chưa có mục tiêu"
          message="Tạo một mục tiêu để PERFIN tính khoản góp và theo dõi tiến độ."
          actionLabel="Tạo mục tiêu"
          actionIcon="add-circle-outline"
          onAction={() => setShowForm(true)}
        />
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          emoji="🔎"
          title="Không tìm thấy mục tiêu"
          message="Thử đổi từ khóa hoặc đặt lại các bộ lọc đang chọn."
          actionLabel="Đặt lại bộ lọc"
          actionIcon="restart-alt"
          onAction={resetGoalFilters}
        />
      ) : filteredGoals.map((goal) => {
        const status = goalProgressStatus(goal);
        const meta = statusMeta(status, c);
        const percent = Number(goal.progress?.actualPercent ?? goal.plan?.progressPercent ?? 0);
        const remaining = Number(goal.progress?.remaining ?? goal.plan?.remaining ?? 0);
        return (
          <Card key={goal.id} style={styles.goalCard} elevated>
            <View style={styles.goalHeader}>
              <View style={[styles.goalIcon, { backgroundColor: meta.bg }]}>
                <AppIcon name={goal.goal_type === 'debt_payoff' ? 'credit-card-off' : goal.goal_type === 'purchase' ? 'shopping-bag' : 'savings'} size={20} color={meta.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalType}>{goalTypeLabel(goal.goal_type)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                <AppIcon name={meta.icon} size={12} color={meta.color} />
                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>

            <View style={styles.progressHeader}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.progressAmount}>{formatVND(goal.current_amount)}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.progressTarget}>/ {formatVND(goal.target_amount)}</Text>
              <Text style={styles.progressPercent}>{Math.min(100, Math.max(0, percent)).toFixed(0)}%</Text>
            </View>
            <ProgressBar percentage={percent} color={meta.color} />

            <View style={styles.goalStats}>
              <View style={styles.goalStat}>
                <Text style={styles.goalStatLabel}>Còn thiếu</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.goalStatValue}>{formatVND(remaining)}</Text>
              </View>
              <View style={styles.goalStat}>
                <Text style={styles.goalStatLabel}>Góp hàng tháng</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.goalStatValue}>{formatVND(goal.plan?.contribution ?? goal.plan?.monthlyPayment ?? 0)}</Text>
              </View>
              <View style={styles.goalStat}>
                <Text style={styles.goalStatLabel}>Dự kiến</Text>
                <Text style={styles.goalStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
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
  const scenarioMessage = whatIfMessage(plan.whatIf);
  return (
    <View style={styles.planBox}>
      <View style={styles.planTitleRow}>
        <AppIcon name="auto-graph" size={17} color={colors.brandText} />
        <Text style={styles.planTitle}>Kế hoạch dự kiến</Text>
      </View>
      <View style={styles.planGrid}>
        <View style={styles.planStat}>
          <Text style={styles.planStatLabel}>Góp/tháng</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.planStatValue}>{formatVND(plan.contribution ?? plan.monthlyPayment ?? 0)}</Text>
        </View>
        <View style={styles.planStat}>
          <Text style={styles.planStatLabel}>Thời gian</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.planStatValue}>{plan.monthsNeeded == null ? 'Chưa xác định' : `${plan.monthsNeeded} tháng`}</Text>
        </View>
        <View style={styles.planStat}>
          <Text style={styles.planStatLabel}>Ngày dự kiến</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.planStatValue}>{plan.projectedDate ? formatDate(plan.projectedDate) : '—'}</Text>
        </View>
        {plan.requiredMonthly != null && (
          <View style={styles.planStat}>
            <Text style={styles.planStatLabel}>Cần để kịp hạn</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.planStatValue}>{formatVND(plan.requiredMonthly)}</Text>
          </View>
        )}
      </View>
      {warning?.message && (
        <View style={styles.warningBox}>
          <AppIcon name="warning-amber" size={15} color={colors.warning} />
          <Text style={styles.warningText}>{warning.message}</Text>
        </View>
      )}
      {scenarioMessage && <Text style={styles.whatIfText}>{scenarioMessage}</Text>}
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
  surplusValue: { maxWidth: '100%', fontSize: 20, fontWeight: '900', marginTop: 2 },
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
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fieldColumn: { flexGrow: 1, flexBasis: 140, minWidth: 0 },
  planBox: {
    marginBottom: 10, padding: 13, backgroundColor: t.colors.brandSoft,
    borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.brand,
  },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  planTitle: { color: t.colors.brandText, fontSize: 13, fontWeight: '900' },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planStat: { flexGrow: 1, flexBasis: 118, minWidth: 0 },
  planStatLabel: { color: t.colors.textMuted, fontSize: 10, fontWeight: '700' },
  planStatValue: { color: t.colors.text, fontSize: 12, fontWeight: '800', marginTop: 2 },
  whatIfText: { color: t.colors.brandText, fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 9 },
  previewRequired: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 10,
    paddingVertical: 9, marginBottom: 9, backgroundColor: t.colors.brandSoft,
    borderRadius: t.radius.sm,
  },
  previewRequiredText: { flex: 1, color: t.colors.brandText, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  sectionHeading: { color: t.colors.text, fontSize: 17, fontWeight: '900' },
  totalBadge: {
    minWidth: 25, height: 25, paddingHorizontal: 7, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.brandSoft,
  },
  totalBadgeText: { color: t.colors.brandText, fontSize: 11, fontWeight: '900' },
  filterPanel: {
    padding: 14, marginBottom: 14, backgroundColor: t.colors.surface,
    borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.lg, ...t.shadows.sm,
  },
  filterHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  filterIcon: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.colors.brandSoft,
  },
  filterTitle: { color: t.colors.text, fontSize: 14, fontWeight: '900' },
  filterSummary: { color: t.colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  resetFilterButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 7,
    borderRadius: t.radius.pill, backgroundColor: t.colors.brandSoft,
  },
  resetFilterText: { color: t.colors.brandText, fontSize: 11, fontWeight: '800' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 13, backgroundColor: t.colors.surfaceAlt, borderWidth: 1.5,
    borderColor: t.colors.border, borderRadius: t.radius.md,
  },
  searchInput: { flex: 1, minWidth: 0, color: t.colors.text, fontSize: 14 },
  filterLabel: { color: t.colors.textSecondary, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 13 },
  filterRowLast: { marginBottom: 0 },
  goalCard: { marginBottom: 11 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14, minWidth: 0 },
  goalIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  goalName: { color: t.colors.text, fontSize: 15, fontWeight: '900' },
  goalType: { color: t.colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  statusBadge: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: t.radius.pill },
  statusText: { fontSize: 10, fontWeight: '800' },
  progressHeader: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  progressAmount: { flexShrink: 1, maxWidth: '42%', color: t.colors.text, fontSize: 16, fontWeight: '900' },
  progressTarget: { flex: 1, minWidth: 0, color: t.colors.textMuted, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  progressPercent: { color: t.colors.brandText, fontSize: 13, fontWeight: '900' },
  goalStats: {
    flexDirection: 'row', marginTop: 12, paddingVertical: 10,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.colors.border,
  },
  goalStat: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
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
