import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatVND } from '../utils/formatters';
import AppIcon from './AppIcon';

function ReceiptOption({ active, icon, label, detail, onPress, styles, colors }) {
  return (
    <TouchableOpacity style={[styles.option, active && styles.optionActive]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.optionIcon, active && styles.optionIconActive]}>
        <AppIcon name={icon} size={17} color={active ? colors.onBrand : colors.brandText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={[styles.optionLabel, active && styles.optionLabelActive]}>{label}</Text>
        <Text numberOfLines={3} style={styles.optionDetail}>{detail}</Text>
      </View>
      <AppIcon name={active ? 'radio-button-checked' : 'radio-button-unchecked'} size={18} color={active ? colors.brand : colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function MediaConfirmationCard({
  kind,
  text,
  context,
  receiptOptions,
  onConfirm,
  onCancel,
  busy = false,
  resolved = false,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;
  const voice = kind === 'voice';
  const [draftText, setDraftText] = useState(text || '');
  const [mode, setMode] = useState(receiptOptions?.suggested === 'items' ? 'items' : 'total');
  const total = receiptOptions?.total;
  const items = receiptOptions?.items || [];
  const itemTotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <AppIcon name={voice ? 'record-voice-over' : 'receipt-long'} size={18} color={c.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>{voice ? 'Xác nhận nội dung giọng nói' : 'Chọn cách ghi hóa đơn'}</Text>
            <Text style={styles.subheading}>
              {voice ? 'Bạn có thể sửa transcript trước khi tiếp tục' : 'Tránh ghi trùng tổng tiền và từng mặt hàng'}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {voice ? (
            <TextInput
              style={styles.transcriptInput}
              value={draftText}
              onChangeText={setDraftText}
              placeholder="Nội dung nhận dạng giọng nói"
              placeholderTextColor={c.textMuted}
              multiline
              editable={!busy && !resolved}
            />
          ) : (
            <View style={{ gap: 8 }}>
              {context ? (
                <View style={styles.contextBox}>
                  <AppIcon name="chat-bubble-outline" size={15} color={c.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contextLabel}>Ngữ cảnh bạn đã gửi cùng ảnh</Text>
                    <Text style={styles.contextText}>{context}</Text>
                  </View>
                </View>
              ) : null}
              {total && (
                <ReceiptOption
                  active={mode === 'total'}
                  icon="functions"
                  label="Ghi tổng hóa đơn"
                  detail={`${total.description || 'Tổng cộng'} · ${formatVND(total.amount)}`}
                  onPress={() => setMode('total')}
                  styles={styles}
                  colors={c}
                />
              )}
              <ReceiptOption
                active={mode === 'items'}
                icon="format-list-bulleted"
                label={`Ghi ${items.length} mặt hàng`}
                detail={`Tổng các mặt hàng · ${formatVND(itemTotal)}`}
                onPress={() => setMode('items')}
                styles={styles}
                colors={c}
              />
              {mode === 'items' && (
                <View style={styles.itemPreview}>
                  {items.slice(0, 4).map((item, index) => (
                    <View key={`${index}-${item.description}`} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.description || `Mặt hàng ${index + 1}`}</Text>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.itemAmount}>{formatVND(item.amount)}</Text>
                    </View>
                  ))}
                  {items.length > 4 && <Text style={styles.moreItems}>+{items.length - 4} mặt hàng khác</Text>}
                </View>
              )}
            </View>
          )}
        </View>

        {resolved ? (
          <View style={styles.resolvedBar}>
            <AppIcon name="check-circle" size={16} color={c.income} />
            <Text style={styles.resolvedText}>{voice ? 'Transcript đã được xác nhận' : 'Lựa chọn đã được xử lý'}</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => onConfirm?.(voice ? draftText.trim() : mode)}
              disabled={busy || (voice && !draftText.trim())}
            >
              {busy
                ? <ActivityIndicator size="small" color={c.onBrand} />
                : <AppIcon name="check" size={17} color={c.onBrand} />}
              <Text style={styles.confirmText}>{voice ? 'Xác nhận transcript' : 'Tiếp tục'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={busy}>
              <Text style={styles.cancelText}>Bỏ qua</Text>
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
    borderWidth: 1.5, borderColor: t.colors.border, overflow: 'hidden', ...t.shadows.md,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14,
    backgroundColor: t.colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: t.colors.border,
  },
  headerIcon: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: t.colors.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  heading: { color: t.colors.text, fontSize: 14, fontWeight: '800' },
  subheading: { color: t.colors.textMuted, fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2 },
  body: { padding: 14 },
  transcriptInput: {
    minHeight: 88, maxHeight: 160, borderWidth: 1.5, borderColor: t.colors.border,
    borderRadius: t.radius.md, padding: 12, backgroundColor: t.colors.surfaceAlt,
    color: t.colors.text, fontSize: 14, lineHeight: 20, textAlignVertical: 'top',
  },
  contextBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10,
    borderRadius: t.radius.sm, backgroundColor: t.colors.surfaceAlt,
    borderWidth: 1, borderColor: t.colors.border,
  },
  contextLabel: { color: t.colors.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  contextText: { color: t.colors.textSecondary, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11,
    borderRadius: t.radius.md, borderWidth: 1.5, borderColor: t.colors.border,
    backgroundColor: t.colors.surfaceAlt,
  },
  optionActive: { borderColor: t.colors.brand, backgroundColor: t.colors.brandSoft },
  optionIcon: {
    width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.colors.surface,
  },
  optionIconActive: { backgroundColor: t.colors.brand },
  optionLabel: { color: t.colors.text, fontSize: 13, fontWeight: '800' },
  optionLabelActive: { color: t.colors.brandText },
  optionDetail: { color: t.colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  itemPreview: {
    padding: 10, borderRadius: t.radius.sm, backgroundColor: t.colors.surfaceAlt,
    borderWidth: 1, borderColor: t.colors.border,
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 3 },
  itemName: { flex: 1, color: t.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  itemAmount: { color: t.colors.expense, fontSize: 11, fontWeight: '800' },
  moreItems: { color: t.colors.brandText, fontSize: 11, fontWeight: '700', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: t.colors.border },
  confirmButton: {
    flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: t.colors.brand, borderRadius: t.radius.md,
  },
  confirmText: { color: t.colors.onBrand, fontWeight: '800', fontSize: 13 },
  cancelButton: {
    justifyContent: 'center', paddingHorizontal: 14, borderRadius: t.radius.md,
    borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  cancelText: { color: t.colors.textMuted, fontWeight: '700', fontSize: 12 },
  resolvedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderTopWidth: 1, borderTopColor: t.colors.border, backgroundColor: t.colors.incomeSoft,
  },
  resolvedText: { color: t.colors.income, fontSize: 12, fontWeight: '800' },
});
