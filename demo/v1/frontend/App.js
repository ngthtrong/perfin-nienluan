import { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import ReportScreen from './src/screens/ReportScreen';
import { COLORS } from './src/utils/constants';

const TABS = [
  { key: 'dashboard', label: 'Tổng quan' },
  { key: 'chat', label: 'Chat' },
  { key: 'transactions', label: 'Giao dịch' },
  { key: 'budgets', label: 'Ngân sách' },
  { key: 'reports', label: 'Báo cáo' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');

  const screens = {
    dashboard: <DashboardScreen goTo={setTab} />,
    chat: <ChatScreen />,
    transactions: <TransactionScreen />,
    budgets: <BudgetScreen />,
    reports: <ReportScreen />,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>PERFIN</Text></View>
      <View style={styles.body}>{screens[tab]}</View>
      <View style={styles.tabs}>
        {TABS.map((item) => (
          <TouchableOpacity key={item.key} style={[styles.tab, tab === item.key && styles.tabActive]} onPress={() => setTab(item.key)}>
            <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  body: { flex: 1 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, padding: 6 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: '#DBEAFE' },
  tabText: { fontSize: 12, color: COLORS.muted },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },
});
