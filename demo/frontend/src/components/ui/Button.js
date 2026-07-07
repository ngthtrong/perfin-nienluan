import { Text, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

// Variants: primary | secondary | ghost | danger. Optional leading icon + loading state.
export default function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  size = 'md',
  fullWidth = true,
  style,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const palette = {
    primary:   { bg: c.brand,      fg: c.onBrand, border: c.brand },
    secondary: { bg: c.surface,    fg: c.text,    border: c.borderStrong },
    ghost:     { bg: 'transparent', fg: c.brandText, border: 'transparent' },
    danger:    { bg: c.expenseSoft, fg: c.expense, border: c.expenseSoft },
  }[variant];

  const pad = size === 'sm'
    ? { paddingVertical: 9, paddingHorizontal: 14 }
    : { paddingVertical: 14, paddingHorizontal: 18 };
  const fontSize = size === 'sm' ? 14 : 15;
  const iconSize = size === 'sm' ? 16 : 18;

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.55 : 1,
          ...pad,
          ...(variant === 'primary' ? theme.shadows.sm : null),
        },
        fullWidth && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {icon && <MaterialIcons name={icon} size={iconSize} color={palette.fg} />}
          <Text style={{ color: palette.fg, fontWeight: '800', fontSize }}>{label}</Text>
          {trailingIcon && <MaterialIcons name={trailingIcon} size={iconSize} color={palette.fg} />}
        </>
      )}
    </TouchableOpacity>
  );
}
