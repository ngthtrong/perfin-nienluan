// Vai trò: Hiển thị số tiền với dấu, màu semantic và kích thước thống nhất.
// Luồng chính: chuẩn hóa amount, chọn màu thu/chi/trung tính rồi dùng formatter VND.

import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatVND } from '../utils/formatters';

export default function BalanceDisplay({ amount, size = 20, showSign = false, style }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const value = Number(amount || 0);
  const color = value > 0 ? c.income : value < 0 ? c.expense : c.textMuted;
  return (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={[{ fontSize: size, fontWeight: '700', color }, style]}>
      {formatVND(value, showSign)}
    </Text>
  );
}
