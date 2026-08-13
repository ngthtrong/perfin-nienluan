// Vai trò: Cung cấp surface bo góc tiêu chuẩn cho nội dung hoặc vùng có thể nhấn.
// Luồng chính: chọn View/TouchableOpacity và ghép style nền, viền, padding theo theme.

import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Standard flat rounded surface.
export default function Card({ children, style, onPress, padded = true }) {
  const { theme } = useTheme();
  const base = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 0,
    ...(padded ? { padding: 16 } : null),
  };

  if (onPress) {
    return (
      <TouchableOpacity accessibilityRole="button" style={[base, style]} onPress={onPress} activeOpacity={0.72}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
