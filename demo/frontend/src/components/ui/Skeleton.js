// Vai trò: Cung cấp placeholder shimmer và nhóm thông báo trạng thái tải cho trợ năng.
// Luồng chính: chạy opacity animation, ẩn khối trang trí và công bố loading một lần ở group.

import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Shimmering placeholder box. Compose several to build loading states.
// Ẩn khỏi cây trợ năng: từng khối là hình trang trí, không mang nội dung.
// Trạng thái "đang tải" được công bố một lần bởi <SkeletonGroup>.
export default function Skeleton({ width = '100%', height = 16, radius = 6, style }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.colors.surfaceAlt, opacity },
        style,
      ]}
    />
  );
}

// Bọc một nhóm skeleton và công bố đúng MỘT trạng thái "đang tải" cho trình
// đọc màn hình, thay vì để người dùng gặp một vùng trống không thông báo gì.
export function SkeletonGroup({ label = 'Đang tải dữ liệu', style, children }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={style}
    >
      {children}
    </View>
  );
}
