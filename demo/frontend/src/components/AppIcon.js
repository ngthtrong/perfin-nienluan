// Vai trò: Bọc MaterialIcons để mọi icon tự dùng màu chữ của theme khi thiếu color.
// Luồng chính: nhận tên/kích thước và render icon nhất quán trong toàn ứng dụng.

import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function AppIcon({ name, size = 20, color, style }) {
  const { theme } = useTheme();
  return <MaterialIcons name={name} size={size} color={color || theme.colors.text} style={style} />;
}
