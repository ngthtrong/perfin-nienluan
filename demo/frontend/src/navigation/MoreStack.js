import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import MoreScreen from '../screens/MoreScreen';
import TransactionScreen from '../screens/TransactionScreen';
import CashflowScreen from '../screens/CashflowScreen';
import RecurringScreen from '../screens/RecurringScreen';
import ExportScreen from '../screens/ExportScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function MoreStack() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="MoreHome" component={MoreScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Transactions" component={TransactionScreen} options={{ title: 'Giao dịch' }} />
      <Stack.Screen name="Cashflow" component={CashflowScreen} options={{ title: 'Dòng tiền & Tài sản' }} />
      <Stack.Screen name="Recurring" component={RecurringScreen} options={{ title: 'Chi phí cố định' }} />
      <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Xuất & Sao lưu' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Cài đặt' }} />
    </Stack.Navigator>
  );
}
