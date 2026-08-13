// Vai trò: Cung cấp hàng menu/cài đặt gồm icon, nội dung và phần trailing.
// Luồng chính: chọn layout theo props và chuyển thành nút truy cập được khi có onPress.

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
          gap: 12,
          minHeight: 64,
          backgroundColor: c.surface,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          paddingVertical: 12,
          paddingHorizontal: 4,
        },
        style,
      ]}
    >
      {icon && (
        <View
          style={{
            width: 28,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={icon} size={20} color={iconColor || c.textSecondary} />
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
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} onPress={onPress} activeOpacity={0.65}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}
