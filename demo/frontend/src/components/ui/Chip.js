import { Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

// Pill-shaped selectable chip. Used for filters, category pickers, provider selection.
export default function Chip({ label, active = false, icon, onPress, disabled = false, style }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: theme.radius.pill,
          borderWidth: 1.5,
          backgroundColor: active ? c.brand : c.surfaceAlt,
          borderColor: active ? c.brand : c.border,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon && <MaterialIcons name={icon} size={15} color={active ? c.onBrand : c.textSecondary} />}
      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? c.onBrand : c.textSecondary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
