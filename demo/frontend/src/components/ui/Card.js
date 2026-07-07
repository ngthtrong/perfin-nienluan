import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Standard rounded surface card. `elevated` adds a soft shadow; `onPress` makes it tappable.
export default function Card({ children, style, onPress, elevated = false, padded = true }) {
  const { theme } = useTheme();
  const base = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...(padded ? { padding: 16 } : null),
    ...(elevated ? theme.shadows.sm : null),
  };

  if (onPress) {
    return (
      <TouchableOpacity style={[base, style]} onPress={onPress} activeOpacity={0.75}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
