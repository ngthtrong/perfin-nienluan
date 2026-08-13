// Vai trò: Cung cấp chip dạng pill cho filter và lựa chọn ngắn.
// Luồng chính: render trạng thái active/disabled, icon tùy chọn và callback chọn.

import { Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

// Pill-shaped selectable chip. Used for filters, category pickers, provider selection.
export default function Chip({ label, active = false, icon, onPress, disabled = false, style, accessibilityLabel }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected: active, disabled }}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 44,
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: theme.radius.pill,
          borderWidth: 1.5,
          backgroundColor: active ? c.brandSoft : c.surfaceAlt,
          borderColor: active ? c.brand : c.border,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon && <MaterialIcons name={icon} size={15} color={active ? c.brandText : c.textSecondary} />}
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, fontWeight: '600', color: active ? c.brandText : c.textSecondary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
