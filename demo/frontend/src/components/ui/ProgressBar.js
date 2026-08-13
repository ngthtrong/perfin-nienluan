// Vai trò: Cung cấp thanh tiến độ dùng màu semantic hoặc màu caller chỉ định.
// Luồng chính: giới hạn percentage về miền hiển thị và render track/fill theo theme.

import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Track + fill bar. Pass explicit `color`, or a `status` to auto-pick a semantic tone.
export default function ProgressBar({ percentage = 0, status, color, height = 8, style }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const statusColor = {
    exceeded: c.expense,
    danger: c.expense,
    warning: c.warning,
    safe: c.income,
  };
  const fillColor = color || statusColor[status] || c.brand;
  const width = `${Math.max(0, Math.min(100, Number(percentage) || 0))}%`;

  return (
    <View
      style={[
        { height, backgroundColor: c.surfaceAlt, borderRadius: height / 2, overflow: 'hidden' },
        style,
      ]}
    >
      <View style={{ height, width, backgroundColor: fillColor, borderRadius: height / 2 }} />
    </View>
  );
}
