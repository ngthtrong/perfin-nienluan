// Vai trò: Hiển thị các pending action không phải form giao dịch với nút xác nhận/hủy.
// Luồng chính: ánh xạ kind từ backend sang nội dung trình bày và khóa nút khi đang xử lý.

import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatVND } from '../utils/formatters';
import AppIcon from './AppIcon';

// Presentation metadata for each backend pending-preview type that needs an
// explicit confirm/cancel affordance. The backend confirm/cancel endpoints are
// generic (they only need the pending_id), so this card is purely a UI bridge:
// it renders the message the backend already produced plus a few key detail
// rows, and calls the shared confirm()/cancel() handlers.
const TYPE_META = {
  transfer_preview: { icon: 'swap-horiz', title: 'Xác nhận chuyển ví' },
  investment_preview: { icon: 'trending-up', title: 'Xác nhận lãi/lỗ đầu tư' },
  budget_suggestion: { icon: 'pie-chart', title: 'Áp dụng ngân sách đề xuất' },
  goal_preview: { icon: 'flag', title: 'Xác nhận mục tiêu tài chính' },
  recurring_preview: { icon: 'event-repeat', title: 'Xác nhận khoản định kỳ' },
  category_suggestion: { icon: 'label', title: 'Xác nhận danh mục mới' },
};

const FREQUENCY_LABEL = {
  weekly: 'hàng tuần',
  monthly: 'hàng tháng',
  quarterly: 'hàng quý',
  yearly: 'hàng năm',
};

// Build a short list of {label, value} detail rows from the type-specific
// payload the backend attaches to the preview message.
function buildDetails(item) {
  switch (item.type) {
    case 'transfer_preview': {
      const t = item.transfer || {};
      return [
        { label: 'Số tiền', value: formatVND(t.amount) },
        { label: 'Từ ví', value: t.from_wallet_name },
        { label: 'Đến ví', value: t.to_wallet_name },
      ];
    }
    case 'investment_preview': {
      const inv = item.investment || {};
      const amount = Number(inv.amount || 0);
      return [
        { label: amount >= 0 ? 'Lãi' : 'Lỗ', value: formatVND(Math.abs(amount)) },
        { label: 'Ví', value: inv.wallet_name },
      ];
    }
    case 'budget_suggestion': {
      const rec = item.recommendation || {};
      const rows = (rec.categories || []).slice(0, 4).map((cat) => ({
        label: cat.category_name,
        value: formatVND(cat.recommended_limit),
      }));
      if (rec.total_recommended != null) {
        rows.unshift({ label: 'Tổng đề xuất', value: formatVND(rec.total_recommended) });
      }
      return rows;
    }
    case 'goal_preview': {
      const goal = item.goal || {};
      const plan = item.plan || {};
      const rows = [
        { label: 'Mục tiêu', value: goal.name },
        { label: 'Số tiền', value: formatVND(goal.target_amount) },
      ];
      if (plan.contribution) rows.push({ label: 'Góp/tháng', value: formatVND(plan.contribution) });
      if (plan.monthsNeeded != null) rows.push({ label: 'Thời gian', value: `khoảng ${plan.monthsNeeded} tháng` });
      return rows;
    }
    case 'recurring_preview': {
      const bill = item.bill || {};
      return [
        { label: 'Khoản chi', value: bill.name },
        { label: 'Số tiền', value: formatVND(bill.amount) },
        { label: 'Chu kỳ', value: FREQUENCY_LABEL[bill.frequency] || bill.frequency },
        { label: 'Ngày', value: bill.due_day != null ? String(bill.due_day) : null },
      ];
    }
    case 'category_suggestion': {
      const s = item.suggestion || {};
      return [
        { label: 'Danh mục', value: s.suggested_name },
        { label: 'Giao dịch liên quan', value: s.occurrences != null ? `${s.occurrences} giao dịch` : null },
      ];
    }
    default:
      return [];
  }
}

// Render action theo kind nhưng luôn giữ cặp thao tác xác nhận/hủy rõ ràng.
export default function PendingActionCard({ item, onConfirm, onCancel, busy = false }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const meta = TYPE_META[item.type] || { icon: 'help-outline', title: 'Xác nhận' };
  const details = buildDetails(item).filter((row) => row.value != null && row.value !== '');
  const resolved = Boolean(item.resolved);

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.heading}>{meta.title}</Text>
        </View>

        <View style={styles.body}>
          {item.text ? <Text style={styles.message}>{item.text}</Text> : null}
          {details.length > 0 && (
            <View style={styles.detailBox}>
              {details.map((row, index) => (
                <View key={`${row.label}-${index}`} style={styles.detailRow}>
                  <Text style={styles.detailLabel} numberOfLines={1}>{row.label}</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {resolved ? (
          <View style={styles.resolvedBar}>
            <AppIcon name="check-circle" size={16} color={c.income} />
            <Text style={styles.resolvedText}>Đã xử lý</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`${meta.title} - xác nhận`}
            >
              {busy
                ? <ActivityIndicator size="small" color={c.onBrand} />
                : <AppIcon name="check" size={17} color={c.onBrand} />}
              <Text style={styles.confirmText}>Xác nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`${meta.title} - hủy`}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (t) => StyleSheet.create({
  wrapper: { alignSelf: 'flex-start', width: '94%', marginBottom: 12 },
  card: {
    backgroundColor: t.colors.surface, borderRadius: t.radius.xl,
    borderWidth: 1, borderColor: t.colors.border, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14,
    borderBottomWidth: 1, borderBottomColor: t.colors.border,
  },
  heading: { flex: 1, color: t.colors.text, fontSize: 14, fontWeight: '700' },
  body: { padding: 14, gap: 10 },
  message: { color: t.colors.text, fontSize: 14, lineHeight: 20 },
  detailBox: {
    padding: 10, borderRadius: t.radius.sm, backgroundColor: t.colors.surfaceAlt,
    borderWidth: 1, borderColor: t.colors.border, gap: 4,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 2 },
  detailLabel: { flex: 1, color: t.colors.textMuted, fontSize: 12, fontWeight: '600' },
  detailValue: { color: t.colors.text, fontSize: 12, fontWeight: '700', maxWidth: '58%' },
  actions: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: t.colors.border },
  confirmButton: {
    flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: t.colors.brand, borderRadius: t.radius.md,
  },
  confirmText: { color: t.colors.onBrand, fontWeight: '700', fontSize: 13 },
  cancelButton: {
    justifyContent: 'center', paddingHorizontal: 14, borderRadius: t.radius.md,
    borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  cancelText: { color: t.colors.textMuted, fontWeight: '700', fontSize: 12 },
  resolvedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderTopWidth: 1, borderTopColor: t.colors.border, backgroundColor: t.colors.incomeSoft,
  },
  resolvedText: { color: t.colors.income, fontSize: 12, fontWeight: '700' },
});
