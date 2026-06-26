import { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import ReportScreen from './src/screens/ReportScreen';
import { AppProvider } from './src/context/AppContext';
import { COLORS } from './src/utils/constants';
import AppIcon from './src/components/AppIcon';

const TABS = [
  { key: 'dashboard', label: 'Tổng quan', icon: 'dashboard' },
  { key: 'chat',         label: 'Chat',       icon: 'chat' },
  { key: 'transactions', label: 'Giao dịch',  icon: 'format-list-bulleted' },
  { key: 'budgets',      label: 'Ngân sách',  icon: 'account-balance-wallet' },
  { key: 'reports',      label: 'Báo cáo',    icon: 'bar-chart' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');

  const screens = {
    dashboard:    <DashboardScreen goTo={setTab} />,
    chat:         <ChatScreen />,
    transactions: <TransactionScreen />,
    budgets:      <BudgetScreen />,
    reports:      <ReportScreen />,
  };

  return (
    <AppProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLogo}>
            <AppIcon name="account-balance-wallet" size={18} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>PERFIN</Text>
          <Text style={styles.headerSub}>Trợ lý tài chính</Text>
        </View>
        <View style={styles.body}>{screens[tab]}</View>
        <View style={styles.tabs}>
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setTab(item.key)}
                activeOpacity={0.75}
              >
                <AppIcon
                  name={item.icon}
                  size={20}
                  color={active ? COLORS.primary : COLORS.muted}
                  style={styles.tabIcon}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  headerLogo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  headerSub: { fontSize: 12, color: COLORS.muted, marginLeft: 2 },
  body: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabActive: { backgroundColor: '#EFF6FF' },
  tabIcon: { marginBottom: 2 },
  tabText: { fontSize: 10, color: COLORS.muted, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },
});
