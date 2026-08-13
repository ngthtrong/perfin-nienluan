// Vai trò: Khai báo năm tab cấp cao nhất của ứng dụng.
// Luồng chính: gắn từng screen/stack vào BottomTabNavigator và dùng TabBar tùy biến.

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TabBar from './TabBar';
import DashboardScreen from '../screens/DashboardScreen';
import ChatScreen from '../screens/ChatScreen';
import BudgetScreen from '../screens/BudgetScreen';
import ReportScreen from '../screens/ReportScreen';
import MoreStack from './MoreStack';

const Tab = createBottomTabNavigator();

// Giữ route name ổn định vì chúng được dùng ở nhiều lời gọi navigate xuyên screen.
export default function RootNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}
