// Vai trò: Cung cấp ô nhập tiền có định dạng hàng nghìn nhưng giữ giá trị form ổn định.
// Luồng chính: format text hiển thị, chuyển thay đổi về caller và hỗ trợ số âm khi cho phép.

import { TextInput } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { formatMoneyInput } from '../../utils/formatters';

export default function MoneyInput({
  value,
  onChangeText,
  allowNegative = false,
  style,
  placeholder = '0',
  ...props
}) {
  const { theme } = useTheme();

  return (
    <TextInput
      {...props}
      accessibilityLabel={props.accessibilityLabel || 'Số tiền'}
      inputMode={allowNegative ? 'decimal' : 'numeric'}
      keyboardType={allowNegative ? 'numbers-and-punctuation' : 'numeric'}
      placeholder={placeholder}
      placeholderTextColor={props.placeholderTextColor || theme.colors.textMuted}
      value={value ?? ''}
      onChangeText={(text) => onChangeText?.(formatMoneyInput(text, { allowNegative }))}
      style={style}
    />
  );
}
