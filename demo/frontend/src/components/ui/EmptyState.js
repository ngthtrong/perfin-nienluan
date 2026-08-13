// Vai trò: Hiển thị trạng thái chưa có dữ liệu cùng hành động phục hồi tùy chọn.
// Luồng chính: render tiêu đề/mô tả và chỉ thêm button khi caller cung cấp callback.

import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button';

// Quiet empty placeholder with an optional recovery/creation action.
export default function EmptyState({ title, message, actionLabel, onAction, actionIcon, style }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        {
          alignItems: 'center',
          paddingVertical: 36,
          paddingHorizontal: 24,
          backgroundColor: c.surface,
          borderRadius: theme.radius.lg,
        },
        style,
      ]}
    >
      {title && <Text style={{ ...theme.typo.heading, color: c.text, marginBottom: 6 }}>{title}</Text>}
      {message && (
        <Text style={{ ...theme.typo.body, color: c.textMuted, textAlign: 'center', marginBottom: 20 }}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} icon={actionIcon} fullWidth={false} />
      )}
    </View>
  );
}
