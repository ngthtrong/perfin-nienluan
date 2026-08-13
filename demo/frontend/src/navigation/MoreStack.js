// Vai trò: Khai báo stack điều hướng cho các công cụ nằm trong tab “Khác”.
// Luồng chính: ánh xạ route tới screen và áp dụng header theo theme hiện tại.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import MoreScreen from '../screens/MoreScreen';
import TransactionScreen from '../screens/TransactionScreen';
import CashflowScreen from '../screens/CashflowScreen';
import RecurringScreen from '../screens/RecurringScreen';
import ExportScreen from '../screens/ExportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import CategoryScreen from '../screens/CategoryScreen';

const Stack = createNativeStackNavigator();

// Tạo native stack cho các màn hình công cụ và cấu hình header theo theme.
export default function MoreStack() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="MoreHome" component={MoreScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Transactions" component={TransactionScreen} options={{ title: 'Giao dịch' }} />
      <Stack.Screen name="Categories" component={CategoryScreen} options={{ title: 'Quản lý danh mục' }} />
      <Stack.Screen name="Cashflow" component={CashflowScreen} options={{ title: 'Dòng tiền & Tài sản' }} />
      <Stack.Screen name="Recurring" component={RecurringScreen} options={{ title: 'Chi phí cố định' }} />
      <Stack.Screen name="Goals" component={GoalsScreen} options={{ title: 'Mục tiêu tài chính' }} />
      <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Xuất & Sao lưu' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Cài đặt' }} />
    </Stack.Navigator>
  );
}
