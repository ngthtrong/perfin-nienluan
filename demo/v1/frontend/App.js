import { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import ReportScreen from './src/screens/ReportScreen';
import CashflowScreen from './src/screens/CashflowScreen';
import ExportScreen from './src/screens/ExportScreen';
import { AppProvider } from './src/context/AppContext';
import { COLORS, SHADOWS } from './src/utils/constants';
import AppIcon from './src/components/AppIcon';

const TABS = [
  { key: 'dashboard',    label: 'Tổng quan', icon: 'dashboard' },
  { key: 'chat',         label: 'Chat AI',   icon: 'chat' },
  { key: 'transactions', label: 'Giao dịch', icon: 'format-list-bulleted' },
  { key: 'budgets',      label: 'Ngân sách', icon: 'account-balance-wallet' },
  { key: 'cashflow',     label: 'Dòng tiền', icon: 'trending-up' },
  { key: 'reports',      label: 'Báo cáo',   icon: 'bar-chart' },
  { key: 'export',       label: 'Xuất/Lưu',  icon: 'cloud-done' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');

  const screens = {
    dashboard:    <DashboardScreen goTo={setTab} />,
    chat:         <ChatScreen />,
    transactions: <TransactionScreen />,
    budgets:      <BudgetScreen />,
    cashflow:     <CashflowScreen />,
    reports:      <ReportScreen />,
    export:       <ExportScreen />,
  };

  return (
    <AppProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <AppIcon name="account-balance-wallet" size={14} color="#fff" />
              </View>
            </View>
            <View>
              <Text style={styles.headerTitle}>PERFIN</Text>
              <Text style={styles.headerSub}>Trợ lý tài chính AI</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.aiDot} />
            <Text style={styles.aiLabel}>AI Online</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>{screens[tab]}</View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.tabItem}
                onPress={() => setTab(item.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                  <AppIcon
                    name={item.icon}
                    size={item.key === 'chat' ? 22 : 20}
                    color={active ? '#fff' : COLORS.muted}
                  />
                </View>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text, letterSpacing: 1.5 },
  headerSub: { fontSize: 10, color: COLORS.muted, fontWeight: '500', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  aiDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.income },
  aiLabel: { fontSize: 11, color: COLORS.income, fontWeight: '700' },

  body: { flex: 1 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
    paddingBottom: 10,
    paddingHorizontal: 4,
    ...SHADOWS.sm,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIconWrap: {
    width: 40,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  tabText: { fontSize: 9, color: COLORS.muted, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },
});
