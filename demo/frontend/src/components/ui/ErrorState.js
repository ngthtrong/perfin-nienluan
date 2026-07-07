import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button';

// Centered error placeholder with retry action.
export default function ErrorState({ title = 'Không tải được dữ liệu', message, onRetry, style }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
        style,
      ]}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: c.expenseSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <MaterialIcons name="warning-amber" size={28} color={c.expense} />
      </View>
      <Text style={{ ...theme.typo.heading, color: c.text, marginBottom: 6 }}>{title}</Text>
      {message && (
        <Text style={{ ...theme.typo.body, color: c.textMuted, textAlign: 'center', marginBottom: 20 }}>
          {message}
        </Text>
      )}
      {onRetry && <Button label="Thử lại" onPress={onRetry} fullWidth={false} />}
    </View>
  );
}
