// Vai trò: Cung cấp trường chọn ngày native có modal và validation hiển thị.
// Luồng chính: mở picker theo nền tảng, chuẩn hóa ngày được chọn và trả giá trị date-only.

import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../theme/ThemeContext';
import { formatDate, fromDateInputValue, toDateInputValue } from '../../utils/formatters';
import AppIcon from '../AppIcon';

function resolveLimit(value) {
  if (!value) return undefined;
  return value instanceof Date ? value : fromDateInputValue(value, undefined);
}

export default function DatePickerField({
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = 'Chọn ngày',
  accessibilityLabel = 'Chọn ngày',
  clearable = true,
  style,
  disabled = false,
  testID,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => fromDateInputValue(value));
  const selected = fromDateInputValue(value);
  const min = resolveLimit(minimumDate);
  const max = resolveLimit(maximumDate);

  function commit(date) {
    if (!date || Number.isNaN(date.getTime())) return;
    onChange?.(toDateInputValue(date));
  }

  return (
    <>
      <View style={[styles.field, style]}>
        <TouchableOpacity
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          activeOpacity={0.75}
          disabled={disabled}
          onPress={() => {
            setDraft(selected);
            setOpen(true);
          }}
          style={styles.trigger}
          testID={testID}
        >
          <AppIcon name="calendar-today" size={17} color={theme.colors.textMuted} />
          <Text style={[styles.value, !value && styles.placeholder]}>
            {value ? formatDate(toDateInputValue(value)) : placeholder}
          </Text>
        </TouchableOpacity>
        {clearable && value && !disabled ? (
          <TouchableOpacity
            accessibilityLabel="Xóa ngày đã chọn"
            accessibilityRole="button"
            onPress={() => onChange?.('')}
            style={styles.clearButton}
          >
            <AppIcon name="close" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          display="default"
          maximumDate={max}
          minimumDate={min}
          mode="date"
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) commit(date);
          }}
          value={selected}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text style={styles.modalSecondary}>Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{accessibilityLabel}</Text>
                <TouchableOpacity onPress={() => { commit(draft); setOpen(false); }}>
                  <Text style={styles.modalPrimary}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                display="spinner"
                locale="vi-VN"
                maximumDate={max}
                minimumDate={min}
                mode="date"
                onChange={(_, date) => date && setDraft(date)}
                themeVariant={theme.dark ? 'dark' : 'light'}
                value={draft}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const createStyles = (theme) => StyleSheet.create({
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
  },
  trigger: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
  },
  value: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  placeholder: { color: theme.colors.textMuted, fontWeight: '500' },
  clearButton: { width: 42, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  modalCard: {
    paddingBottom: 24,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
  modalHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  modalTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  modalPrimary: { color: theme.colors.brandText, fontSize: 15, fontWeight: '700' },
  modalSecondary: { color: theme.colors.textMuted, fontSize: 15, fontWeight: '700' },
});
