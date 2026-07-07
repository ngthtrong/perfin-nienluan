import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Screen, ListRow, AppHeader } from '../components/ui';

const TOOLS = [
  { route: 'Transactions', icon: 'format-list-bulleted', title: 'Giao dịch', subtitle: 'Xem và quản lý mọi khoản thu chi', color: '#6366F1', bg: '#EEEDFF' },
  { route: 'Cashflow', icon: 'trending-up', title: 'Dòng tiền & Tài sản', subtitle: 'Chuyển ví, đầu tư, tài sản ròng', color: '#0EA5C6', bg: '#DEF4FA' },
  { route: 'Recurring', icon: 'event-repeat', title: 'Chi phí cố định', subtitle: 'Hóa đơn định kỳ và nhắc nhở', color: '#8B5CF6', bg: '#F1ECFE' },
  { route: 'Export', icon: 'cloud-done', title: 'Xuất & Sao lưu', subtitle: 'CSV, PDF, sao lưu dữ liệu', color: '#0FA968', bg: '#DFF6EC' },
];

export default function MoreScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Screen scroll edges={['top']}>
      <AppHeader subtitle="Công cụ & Cài đặt" showAIStatus={false} />

      <View style={{ paddingHorizontal: 0, paddingTop: 8, gap: 10 }}>
        <Text style={{ ...theme.typo.label, color: c.textMuted, marginBottom: 2, marginLeft: 4 }}>QUẢN LÝ</Text>
        {TOOLS.map((t) => (
          <ListRow
            key={t.route}
            icon={t.icon}
            iconColor={t.color}
            iconBg={t.bg}
            title={t.title}
            subtitle={t.subtitle}
            onPress={() => navigation.navigate(t.route)}
          />
        ))}

        <Text style={{ ...theme.typo.label, color: c.textMuted, marginTop: 12, marginBottom: 2, marginLeft: 4 }}>
          HỆ THỐNG
        </Text>
        <ListRow
          icon="settings"
          title="Cài đặt"
          subtitle="Giao diện, trợ lý AI, thông tin"
          onPress={() => navigation.navigate('Settings')}
        />
      </View>
    </Screen>
  );
}
