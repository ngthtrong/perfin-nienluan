// Vai trò: Hiển thị header ngữ cảnh thống nhất cho các tab cấp cao nhất.
// Luồng chính: nhận tiêu đề/phụ đề/action và áp dụng typography theo theme.

import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Contextual header for root tabs.
export default function AppHeader({ title = 'Tổng quan', subtitle, right }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={{
        backgroundColor: c.bg,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <View style={{
        width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row',
        minHeight: 52, alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} accessibilityRole="header" style={{ ...theme.typo.title, color: c.text }}>{title}</Text>
          {subtitle ? (
            <Text numberOfLines={1} style={{ ...theme.typo.caption, color: c.textMuted, marginTop: 1 }}>{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View style={{ flexShrink: 0 }}>{right}</View> : null}
      </View>
    </View>
  );
}
