import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

// Settings/tools style row: leading icon chip, title + optional subtitle, trailing chevron or custom node.
export default function ListRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  trailing,
  showChevron = true,
  style,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          backgroundColor: c.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: c.border,
          paddingVertical: 14,
          paddingHorizontal: 16,
        },
        style,
      ]}
    >
      {icon && (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: iconBg || c.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={icon} size={20} color={iconColor || c.brand} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ ...theme.typo.bodyStrong, color: c.text }}>{title}</Text>
        {subtitle && (
          <Text numberOfLines={2} style={{ ...theme.typo.caption, color: c.textMuted, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {trailing}
      {showChevron && !trailing && <MaterialIcons name="chevron-right" size={22} color={c.textMuted} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity accessibilityRole="button" onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}
