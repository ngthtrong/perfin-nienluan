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
