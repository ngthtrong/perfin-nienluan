import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Screen, ListRow, AppHeader } from '../components/ui';

const TOOLS = [
  { route: 'Transactions', icon: 'format-list-bulleted', title: 'Giao dịch', subtitle: 'Xem và quản lý mọi khoản thu chi', tone: 'brand' },
  { route: 'Cashflow', icon: 'trending-up', title: 'Dòng tiền & Tài sản', subtitle: 'Chuyển ví, đầu tư, tài sản ròng', tone: 'info' },
  { route: 'Recurring', icon: 'event-repeat', title: 'Chi phí cố định', subtitle: 'Hóa đơn định kỳ và nhắc nhở', tone: 'brand' },
  { route: 'Goals', icon: 'flag', title: 'Mục tiêu tài chính', subtitle: 'Lập kế hoạch và theo dõi tiến độ', tone: 'warning' },
  { route: 'Export', icon: 'cloud-done', title: 'Xuất & Sao lưu', subtitle: 'CSV, PDF, sao lưu dữ liệu', tone: 'income' },
];

export default function MoreScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Screen scroll padded={false} edges={['top']}>
      <AppHeader subtitle="Công cụ & Cài đặt" showAIStatus={false} />

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 10 }}>
        <Text style={{ ...theme.typo.label, color: c.textMuted, marginBottom: 2, marginLeft: 4 }}>QUẢN LÝ</Text>
        {TOOLS.map((t) => (
          <ListRow
            key={t.route}
            icon={t.icon}
            iconColor={c[t.tone] || c.brand}
            iconBg={c[`${t.tone}Soft`] || c.brandSoft}
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
