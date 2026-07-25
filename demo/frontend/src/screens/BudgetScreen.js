import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { HIT_SLOP } from '../theme/tokens';
import { currentPeriod, formatVND, parseMoneyInput } from '../utils/formatters';
import { showAlert } from '../utils/alerts';
import BudgetProgressBar from '../components/BudgetProgressBar';
import AppIcon from '../components/AppIcon';
import CategoryIcon from '../components/CategoryIcon';
import {
  AppHeader, Button, Chip, EmptyState, ErrorState, MoneyInput, Skeleton, SkeletonGroup,
} from '../components/ui';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'stable', label: 'Ổn định' },
  { value: 'warning', label: 'Cần chú ý' },
  { value: 'exceeded', label: 'Vượt mức' },
];

const SORT_FILTERS = [
  { value: 'usage', label: '% đã dùng' },
  { value: 'spent', label: 'Đã chi' },
  { value: 'limit', label: 'Hạn mức' },
  { value: 'name', label: 'Tên A–Z' },
];

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
  const [period, setPeriod] = useState(() => currentPeriod());

  const [progress, setProgress] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [forecastError, setForecastError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingRecommendation, setApplyingRecommendation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('usage');
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [rowBusyId, setRowBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [items, forecastResult, cats, suggested] = await Promise.all([
        api.getBudgetProgress(period.month, period.year),
        api.getBudgetForecast(period.month, period.year).catch((forecastFailure) => ({ forecastFailure })),
        api.getCategories('expense'),
        api.getBudgetRecommendations('hybrid').catch(() => null),
      ]);
      setProgress(items.data || []);
      if (forecastResult?.forecastFailure) {
        setForecast([]);
        setForecastError(forecastResult.forecastFailure.message || 'Không tải được dự báo ngân sách.');
      } else {
        setForecast(forecastResult?.data || []);
        setForecastError(null);
      }
      setCategories(cats.data || []);
      setRecommendation(suggested?.data || null);
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
    const parsedAmount = parseMoneyInput(amount);
    if (!categoryId || !(parsedAmount > 0)) {
      showAlert('Thiếu thông tin', 'Vui lòng chọn danh mục và nhập số tiền ngân sách.');
      return;
    }
    setSaving(true);
    try {
      await api.createBudget({ category_id: categoryId, amount_limit: parsedAmount, month: period.month, year: period.year });
      setAmount('');
      setShowForm(false);
      await load();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Không thể tạo ngân sách');
    } finally {
      setSaving(false);
    }
  }

  function applyRecommendation() {
    if (!recommendation?.categories?.length) return;
    showAlert(
      'Áp dụng ngân sách đề xuất?',
      `PERFIN sẽ tạo hoặc cập nhật ${recommendation.categories.length} ngân sách cho tháng ${period.month}/${period.year}.`,
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: 'Áp dụng',
          onPress: async () => {
            setApplyingRecommendation(true);
            try {
              const rows = recommendation.categories.map((item) => ({
                category_id: item.category_id,
                amount_limit: item.recommended_limit,
              }));
              await api.applyBudgetRecommendations(rows, period.month, period.year);
              await load();
              showAlert('Đã áp dụng', 'Ngân sách đề xuất đã được cập nhật.');
            } catch (err) {
              showAlert('Không thể áp dụng', err.message);
            } finally {
              setApplyingRecommendation(false);
            }
          },
        },
      ]
    );
  }

  function startEdit(item) {
    setEditingId(item.budget_id);
    setEditAmount(String(Math.round(Number(item.amount_limit) || 0)));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAmount('');
  }

  async function saveEdit(item) {
    const parsedAmount = parseMoneyInput(editAmount);
    if (!(parsedAmount > 0)) {
      showAlert('Số tiền không hợp lệ', 'Vui lòng nhập mức ngân sách lớn hơn 0.');
      return;
    }
    setRowBusyId(item.budget_id);
    try {
      await api.updateBudget(item.budget_id, { amount_limit: parsedAmount });
      cancelEdit();
      await load();
    } catch (err) {
      showAlert('Lỗi', err.message || 'Không thể cập nhật ngân sách');
    } finally {
      setRowBusyId(null);
    }
  }

  function removeBudget(item) {
    showAlert(
      'Xóa ngân sách?',
      `Xóa ngân sách cho "${item.category_name}" trong tháng ${period.month}/${period.year}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setRowBusyId(item.budget_id);
            try {
              await api.deleteBudget(item.budget_id);
              if (editingId === item.budget_id) cancelEdit();
              await load();
            } catch (err) {
              showAlert('Lỗi', err.message || 'Không thể xóa ngân sách');
            } finally {
              setRowBusyId(null);
            }
          },
        },
      ]
    );
  }

  const totalBudget = progress.reduce((s, i) => s + Number(i.amount_limit), 0);
  const totalSpent = progress.reduce((s, i) => s + Number(i.spent), 0);
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const pctColor = overallPct > 100 ? c.expense : overallPct > 70 ? c.warning : c.income;
  const pctBg = overallPct > 100 ? c.expenseSoft : overallPct > 70 ? c.warningSoft : c.incomeSoft;
  const overspendForecasts = forecast
    .filter((item) => item.likely_to_exceed)
    .sort((left, right) => Number(right.projected_percentage) - Number(left.projected_percentage));
  const visibleProgress = useMemo(() => {
    const search = categorySearch.trim().toLocaleLowerCase('vi-VN');
    const rows = progress.filter((item) => {
      if (search && !String(item.category_name || '').toLocaleLowerCase('vi-VN').includes(search)) return false;
      if (statusFilter === 'stable') return !['warning', 'danger', 'exceeded'].includes(item.status);
      if (statusFilter === 'warning') return ['warning', 'danger'].includes(item.status);
      if (statusFilter === 'exceeded') return item.status === 'exceeded';
      return true;
    });
    return [...rows].sort((left, right) => {
      if (sortFilter === 'name') return String(left.category_name || '').localeCompare(String(right.category_name || ''), 'vi');
      if (sortFilter === 'spent') return Number(right.spent || 0) - Number(left.spent || 0);
      if (sortFilter === 'limit') return Number(right.amount_limit || 0) - Number(left.amount_limit || 0);
      return Number(right.percentage || 0) - Number(left.percentage || 0);
    });
  }, [categorySearch, progress, sortFilter, statusFilter]);

  function changeMonth(delta) {
    setLoading(true);
    setPeriod((current) => {
      let month = current.month + delta;
      let year = current.year;
      if (month > 12) { month = 1; year += 1; }
      if (month < 1) { month = 12; year -= 1; }
      return { month, year };
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader subtitle="Ngân sách" showAIStatus={false} />
        <SkeletonGroup label="Đang tải ngân sách" style={styles.loadingContent}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={96} radius={18} />)}
        </SkeletonGroup>
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
        data={visibleProgress}
        keyExtractor={(item) => String(item.budget_id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
        ListHeaderComponent={
          <View>
            <View style={styles.monthNav}>
              <TouchableOpacity accessibilityLabel="Tháng trước" accessibilityRole="button" onPress={() => changeMonth(-1)} hitSlop={HIT_SLOP} style={styles.monthNavButton}>
                <AppIcon name="chevron-left" size={21} color={c.brandText} />
              </TouchableOpacity>
              <View style={styles.monthNavTitle}>
                <AppIcon name="calendar-today" size={15} color={c.brandText} />
                <Text style={styles.monthNavText}>Tháng {period.month} · {period.year}</Text>
              </View>
              <TouchableOpacity accessibilityLabel="Tháng sau" accessibilityRole="button" onPress={() => changeMonth(1)} hitSlop={HIT_SLOP} style={styles.monthNavButton}>
                <AppIcon name="chevron-right" size={21} color={c.brandText} />
              </TouchableOpacity>
            </View>

            <View style={styles.overviewCard}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.periodChip}>
                  <AppIcon name="calendar-today" size={13} color={c.brandText} />
                  <Text style={styles.periodText}>Tháng {period.month}/{period.year}</Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.overviewSpent}>{formatVND(totalSpent)}</Text>
                <Text numberOfLines={2} style={styles.overviewTotal}>/ {formatVND(totalBudget)} ngân sách</Text>
              </View>
              <View style={[styles.pctCircle, { borderColor: pctColor, backgroundColor: pctBg }]}>
                <Text style={[styles.pctText, { color: pctColor }]}>{overallPct}%</Text>
                <Text style={styles.pctLabel}>đã dùng</Text>
              </View>
            </View>

            {overspendForecasts.length > 0 && (
              <View style={styles.forecastCard}>
                <View style={styles.forecastHeader}>
                  <View style={styles.forecastIcon}>
                    <AppIcon name="trending-up" size={17} color={c.warning} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.forecastTitle}>Dự báo có thể vượt ngân sách</Text>
                    <Text style={styles.forecastSub}>
                      {overspendForecasts.length} danh mục có nguy cơ vượt hạn mức nếu tốc độ chi hiện tại tiếp tục.
                    </Text>
                  </View>
                </View>

                <View style={styles.forecastList}>
                  {overspendForecasts.slice(0, 4).map((item, index) => {
                    const limit = Number(item.amount_limit) || 0;
                    const spent = Number(item.spent) || 0;
                    const projectedSpend = Number(item.projected_spend) || 0;
                    const projectedOver = Math.max(0, projectedSpend - limit);
                    const alreadyOver = spent > limit;
                    const timing = alreadyOver
                      ? `Hiện đã vượt ${formatVND(spent - limit)}`
                      : item.projected_exceed_day
                        ? `Có thể chạm hạn mức khoảng ngày ${item.projected_exceed_day}/${period.month}`
                        : 'Có thể vượt hạn mức trước cuối tháng';
                    return (
                      <View key={item.budget_id || item.category_id} style={[styles.forecastRow, index > 0 && styles.forecastBorder]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={styles.forecastName}>{item.category_name}</Text>
                          <Text style={styles.forecastDetail}>{timing} · dự kiến vượt {formatVND(projectedOver)}.</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', maxWidth: '36%' }}>
                          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.forecastAmount}>{formatVND(projectedSpend)}</Text>
                          <Text style={styles.forecastPercent}>{Math.round(Number(item.projected_percentage) || 0)}% hạn mức</Text>
                        </View>
                      </View>
                    );
                  })}
                  {overspendForecasts.length > 4 && (
                    <Text style={styles.forecastMore}>+{overspendForecasts.length - 4} danh mục có nguy cơ khác</Text>
                  )}
                </View>
              </View>
            )}

            {forecastError && progress.length > 0 && (
              <View style={styles.forecastUnavailable}>
                <AppIcon name="info-outline" size={15} color={c.warning} />
                <Text style={styles.forecastUnavailableText}>Chưa cập nhật được dự báo chi tiêu: {forecastError}</Text>
              </View>
            )}

            {recommendation && (
              <View style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationIcon}>
                    <AppIcon name="auto-awesome" size={18} color={c.onBrand} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.recommendationTitle}>Ngân sách PERFIN đề xuất</Text>
                    <Text style={styles.recommendationSub}>
                      {recommendation.history_months || 0} tháng dữ liệu · chiến lược cân bằng
                    </Text>
                  </View>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.recommendationTotal}>{formatVND(recommendation.total_recommended)}</Text>
                </View>

                {recommendation.categories?.length > 0 ? (
                  <>
                    <View style={styles.recommendationList}>
                      {recommendation.categories.slice(0, 4).map((item, index) => (
                        <View key={item.category_id} style={[styles.recommendationRow, index > 0 && styles.recommendationBorder]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.recommendationName}>{item.category_name}</Text>
                            <Text style={styles.recommendationReason} numberOfLines={1}>{item.rationale}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.recommendationAmount}>{formatVND(item.recommended_limit)}</Text>
                            <Text style={styles.recommendationConfidence}>
                              {item.confidence === 'high' ? 'Tin cậy cao' : item.confidence === 'medium' ? 'Tin cậy vừa' : 'Khởi điểm'}
                            </Text>
                          </View>
                        </View>
                      ))}
                      {recommendation.categories.length > 4 && (
                        <Text style={styles.recommendationMore}>+{recommendation.categories.length - 4} danh mục khác</Text>
                      )}
                    </View>

                    {recommendation.warnings?.map((warning, index) => (
                      <View key={`${warning}-${index}`} style={styles.recommendationWarning}>
                        <AppIcon name="info-outline" size={14} color={c.warning} />
                        <Text style={styles.recommendationWarningText}>{warning}</Text>
                      </View>
                    ))}

                    <Button
                      label="Áp dụng đề xuất"
                      icon="playlist-add-check"
                      size="sm"
                      onPress={applyRecommendation}
                      loading={applyingRecommendation}
                      style={{ marginTop: 11 }}
                    />
                  </>
                ) : (
                  <Text style={styles.recommendationEmpty}>
                    Hãy ghi thêm giao dịch để PERFIN có đủ dữ liệu đề xuất hạn mức theo danh mục.
                  </Text>
                )}
              </View>
            )}

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
                  <MoneyInput
                    style={[styles.input, { flexGrow: 1, flexBasis: 180, minWidth: 0, marginBottom: 0 }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Ví dụ: 2,000,000"
                    placeholderTextColor={c.textMuted}
                  />
                  {amount.length > 0 && (
                    <View style={styles.amountPreview}>
                      <Text style={styles.amountPreviewText}>{formatVND(parseMoneyInput(amount))}</Text>
                    </View>
                  )}
                </View>

                <Button label="Tạo ngân sách" icon="savings" onPress={add} loading={saving} />
              </View>
            )}

            {progress.length > 0 && (
              <View style={styles.filterCard}>
                <View style={styles.searchBox}>
                  <AppIcon name="search" size={18} color={c.textMuted} />
                  <TextInput
                    accessibilityLabel="Tìm danh mục ngân sách"
                    onChangeText={setCategorySearch}
                    placeholder="Tìm theo danh mục..."
                    placeholderTextColor={c.textMuted}
                    style={styles.searchInput}
                    value={categorySearch}
                  />
                  {categorySearch ? (
                    <TouchableOpacity accessibilityLabel="Xóa từ khóa" onPress={() => setCategorySearch('')}>
                      <AppIcon name="close" size={17} color={c.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.filterLabel}>Trạng thái</Text>
                <View style={styles.filterRow}>
                  {STATUS_FILTERS.map((option) => (
                    <Chip
                      key={option.value}
                      active={statusFilter === option.value}
                      label={option.label}
                      onPress={() => setStatusFilter(option.value)}
                    />
                  ))}
                </View>
                <Text style={styles.filterLabel}>Sắp xếp</Text>
                <View style={styles.filterRow}>
                  {SORT_FILTERS.map((option) => (
                    <Chip
                      key={option.value}
                      active={sortFilter === option.value}
                      label={option.label}
                      onPress={() => setSortFilter(option.value)}
                    />
                  ))}
                </View>
              </View>
            )}

            {progress.length > 0 && (
              <Text style={styles.sectionTitle}>Theo danh mục · {visibleProgress.length}/{progress.length}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const meta = getStatusMeta(item.status, c);
          const isEditing = editingId === item.budget_id;
          const rowBusy = rowBusyId === item.budget_id;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.catIcon}>
                    <CategoryIcon icon={item.category_icon} name={item.category_name} type="expense" size={16} color={c.brand} />
                  </View>
                      <Text numberOfLines={1} style={styles.cardTitle}>{item.category_name}</Text>
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

              {isEditing ? (
                <View style={styles.editBox}>
                  <Text style={styles.editLabel}>Mức ngân sách mới (VND)</Text>
                  <View style={styles.amountRow}>
                    <MoneyInput
                      style={[styles.input, { flexGrow: 1, flexBasis: 180, minWidth: 0, marginBottom: 0 }]}
                      value={editAmount}
                      onChangeText={setEditAmount}
                      placeholder="Ví dụ: 2,000,000"
                      placeholderTextColor={c.textMuted}
                    />
                    {editAmount.length > 0 && (
                      <View style={styles.amountPreview}>
                        <Text style={styles.amountPreviewText}>{formatVND(parseMoneyInput(editAmount))}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.editActions}>
                    <Button label="Lưu" icon="check" size="sm" onPress={() => saveEdit(item)} loading={rowBusy} style={{ flex: 1 }} />
                    <Button label="Hủy" icon="close" size="sm" variant="secondary" onPress={cancelEdit} disabled={rowBusy} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Sửa ngân sách ${item.category_name}`}
                    style={styles.actionButton}
                    onPress={() => startEdit(item)}
                    disabled={rowBusy}
                  >
                    <AppIcon name="edit" size={15} color={c.brandText} />
                    <Text style={styles.actionText}>Sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Xóa ngân sách ${item.category_name}`}
                    style={styles.actionButton}
                    onPress={() => removeBudget(item)}
                    disabled={rowBusy}
                  >
                    <AppIcon name="delete-outline" size={15} color={c.expense} />
                    <Text style={[styles.actionText, { color: c.expense }]}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          progress.length > 0 ? (
            <EmptyState
              emoji="🔎"
              title="Không có kết quả phù hợp"
              message="Thử đổi từ khóa, trạng thái hoặc cách sắp xếp."
            />
          ) : (
            <EmptyState
              emoji="💰"
              title="Chưa có ngân sách"
              message="Thêm ngân sách để kiểm soát chi tiêu tốt hơn!"
              actionLabel="Thêm ngân sách"
              actionIcon="add-circle-outline"
              onAction={() => setShowForm(true)}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (t) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 32 },
  loadingContent: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 10 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 10, marginBottom: 12, borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, ...t.shadows.sm,
  },
  monthNavButton: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    borderRadius: 19, backgroundColor: t.colors.brandSoft,
  },
  monthNavTitle: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  monthNavText: { color: t.colors.text, fontSize: 15, fontWeight: '800' },

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

  forecastCard: {
    backgroundColor: t.colors.warningSoft, padding: 15, borderRadius: t.radius.lg,
    borderWidth: 1, borderColor: t.colors.warning, marginBottom: 12,
  },
  forecastHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  forecastIcon: {
    width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.colors.surface,
  },
  forecastTitle: { color: t.colors.text, fontSize: 13, fontWeight: '900' },
  forecastSub: { color: t.colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '600', marginTop: 2 },
  forecastList: { marginTop: 10, borderTopWidth: 1, borderTopColor: t.colors.borderStrong },
  forecastRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9 },
  forecastBorder: { borderTopWidth: 1, borderTopColor: t.colors.border },
  forecastName: { color: t.colors.text, fontSize: 12, fontWeight: '800' },
  forecastDetail: { color: t.colors.textMuted, fontSize: 9, lineHeight: 14, fontWeight: '600', marginTop: 2 },
  forecastAmount: { color: t.colors.expense, fontSize: 11, fontWeight: '900' },
  forecastPercent: { color: t.colors.warning, fontSize: 9, fontWeight: '800', marginTop: 2 },
  forecastMore: { color: t.colors.warning, fontSize: 10, fontWeight: '800', paddingBottom: 2 },
  forecastUnavailable: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 10,
    backgroundColor: t.colors.warningSoft, borderRadius: t.radius.md, marginBottom: 12,
  },
  forecastUnavailableText: { flex: 1, color: t.colors.warning, fontSize: 10, lineHeight: 15, fontWeight: '700' },

  recommendationCard: {
    backgroundColor: t.colors.surface, padding: 15, borderRadius: t.radius.lg,
    borderWidth: 1.5, borderColor: t.colors.brand, marginBottom: 12, ...t.shadows.sm,
  },
  recommendationHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  recommendationIcon: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: t.colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  recommendationTitle: { color: t.colors.text, fontSize: 13, fontWeight: '900' },
  recommendationSub: { color: t.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  recommendationTotal: { flexShrink: 1, color: t.colors.brandText, fontSize: 13, fontWeight: '900', maxWidth: '32%', textAlign: 'right' },
  recommendationList: {
    marginTop: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.colors.border,
  },
  recommendationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  recommendationBorder: { borderTopWidth: 1, borderTopColor: t.colors.border },
  recommendationName: { color: t.colors.text, fontSize: 12, fontWeight: '800' },
  recommendationReason: { color: t.colors.textMuted, fontSize: 9, fontWeight: '600', marginTop: 2 },
  recommendationAmount: { color: t.colors.textSecondary, fontSize: 11, fontWeight: '900' },
  recommendationConfidence: { color: t.colors.income, fontSize: 9, fontWeight: '700', marginTop: 2 },
  recommendationMore: { color: t.colors.brandText, fontSize: 10, fontWeight: '700', paddingBottom: 8 },
  recommendationWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 5, paddingTop: 8,
  },
  recommendationWarningText: { flex: 1, color: t.colors.warning, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  recommendationEmpty: { color: t.colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 12 },

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
  amountRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 },
  input: {
    borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md,
    padding: 13, fontSize: 15, color: t.colors.text, backgroundColor: t.colors.surfaceAlt,
  },
  amountPreview: { maxWidth: '100%', backgroundColor: t.colors.brandSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: t.radius.pill },
  amountPreviewText: { color: t.colors.brandText, fontWeight: '800', fontSize: 13, flexShrink: 1 },

  filterCard: {
    padding: 14, marginBottom: 14, borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, ...t.shadows.sm,
  },
  searchBox: {
    minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 12, marginBottom: 12, borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.border,
  },
  searchInput: { flex: 1, minWidth: 0, color: t.colors.text, fontSize: 14 },
  filterLabel: { color: t.colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 7 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 11 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: t.colors.text, marginBottom: 12 },

  card: {
    backgroundColor: t.colors.surface, padding: 16, borderRadius: t.radius.lg,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: 10, ...t.shadows.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  catIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: t.colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '800', color: t.colors.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: t.radius.pill },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6, marginTop: 10 },
  metaText: { flexGrow: 1, flexBasis: 132, color: t.colors.textMuted, fontSize: 12 },

  cardActions: {
    flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: t.colors.border,
  },
  actionButton: {
    flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: t.radius.md, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  actionText: { color: t.colors.brandText, fontWeight: '700', fontSize: 13 },
  editBox: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.colors.border,
  },
  editLabel: { color: t.colors.textMuted, fontWeight: '700', fontSize: 13, marginBottom: 8 },
  editActions: { flexDirection: 'row', gap: 8 },
});
