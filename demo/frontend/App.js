// Vai trò: Lắp ghép provider cấp ứng dụng và khởi tạo cây điều hướng PERFIN.
// Luồng chính: lấy theme hiện tại, ánh xạ sang NavigationContainer rồi render RootNavigator.

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';

function ThemedApp() {
  const { theme } = useTheme();
  const c = theme.colors;

  const navTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme : DefaultTheme).colors,
      primary: c.brand,
      background: c.bg,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.expense,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

// Bọc toàn bộ ứng dụng bằng safe-area và theme trước khi render navigation.
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
