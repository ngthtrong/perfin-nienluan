import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Shimmering placeholder box. Compose several to build loading states.
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
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.colors.surfaceAlt, opacity },
        style,
      ]}
    />
  );
}
