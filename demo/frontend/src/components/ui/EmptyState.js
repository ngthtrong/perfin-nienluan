import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button';

// Centered empty placeholder with emoji, message, and optional CTA.
export default function EmptyState({ emoji = '📭', title, message, actionLabel, onAction, actionIcon, style }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        {
          alignItems: 'center',
          paddingVertical: 44,
          paddingHorizontal: 24,
          backgroundColor: c.surface,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: c.border,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: c.brandSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 34 }}>{emoji}</Text>
      </View>
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
