// Vai trò: Cung cấp lựa chọn một giá trị trong nhóm segment điều khiển từ bên ngoài.
// Luồng chính: so value hiện tại, tô segment active và phát onChange khi người dùng chọn.

import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Flat segmented control. options: [{ value, label }]. Controlled via value/onChange.
export default function SegmentedControl({ options, value, onChange, style }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: c.surfaceAlt,
          borderRadius: theme.radius.md,
          padding: 4,
          gap: 4,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 9,
              borderRadius: theme.radius.sm,
              backgroundColor: active ? c.surface : 'transparent',
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={{ fontSize: 13, fontWeight: '700', color: active ? c.brandText : c.textMuted }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
