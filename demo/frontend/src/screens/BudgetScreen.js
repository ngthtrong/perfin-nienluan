import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { currentPeriod, formatVND } from '../utils/formatters';
import { showAlert } from '../utils/alerts';
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
    if (!categoryId || !amount || Number(amount) <= 0) {
      showAlert('Thiếu thông tin', 'Vui lòng chọn danh mục và nhập số tiền ngân sách.');
      return;
    }
    setSaving(true);
    try {
      await api.createBudget({ category_id: categoryId, amount_limit: Number(amount), month: period.month, year: period.year });
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

  const totalBudget = progress.reduce((s, i) => s + Number(i.amount_limit), 0);
  const totalSpent = progress.reduce((s, i) => s + Number(i.spent), 0);
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const pctColor = overallPct > 100 ? c.expense : overallPct > 70 ? c.warning : c.income;
  const pctBg = overallPct > 100 ? c.expenseSoft : overallPct > 70 ? c.warningSoft : c.incomeSoft;
  const overspendForecasts = forecast
    .filter((item) => item.likely_to_exceed)
    .sort((left, right) => Number(right.projected_percentage) - Number(left.projected_percentage));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader subtitle="Ngân sách" showAIStatus={false} />
        <View style={styles.loadingContent}>
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
                  <TextInput
                    style={[styles.input, { flexGrow: 1, flexBasis: 180, minWidth: 0, marginBottom: 0 }]}
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
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 32 },
  loadingContent: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 10 },

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
});
