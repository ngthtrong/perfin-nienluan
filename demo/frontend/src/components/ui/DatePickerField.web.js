import { createElement, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { toDateInputValue } from '../../utils/formatters';
import AppIcon from '../AppIcon';

export default function DatePickerField({
  value,
  onChange,
  minimumDate,
  maximumDate,
  accessibilityLabel = 'Chọn ngày',
  clearable = true,
  style,
  disabled = false,
  testID,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const dateInput = createElement('input', {
    'aria-label': accessibilityLabel,
    'data-testid': testID,
    disabled,
    max: toDateInputValue(maximumDate) || undefined,
    min: toDateInputValue(minimumDate) || undefined,
    onChange: (event) => onChange?.(toDateInputValue(event.currentTarget.value)),
    style: {
      minWidth: 0,
      minHeight: 44,
      flex: 1,
      width: '100%',
      padding: 0,
      border: 0,
      outline: 'none',
      background: 'transparent',
      color: theme.colors.text,
      fontFamily: 'inherit',
      fontSize: 15,
      fontWeight: 600,
      boxSizing: 'border-box',
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    type: 'date',
    value: toDateInputValue(value),
  });

  return (
    <View style={[styles.wrapper, disabled && styles.disabled, style]}>
      <AppIcon name="calendar-today" size={17} color={theme.colors.textMuted} />
      {dateInput}
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
  );
}

const createStyles = (theme) => StyleSheet.create({
  wrapper: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 13,
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
  },
  disabled: { opacity: 0.55 },
  clearButton: { width: 42, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
