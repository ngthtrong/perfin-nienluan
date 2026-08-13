// Vai trò: Là menu dẫn tới các công cụ quản lý mở rộng ngoài năm tab chính.
// Luồng chính: render danh sách route có mô tả và chuyển sang screen tương ứng khi chọn.

import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Screen, ListRow, AppHeader } from '../components/ui';

const TOOLS = [
  { route: 'Transactions', title: 'Giao dịch', subtitle: 'Xem và quản lý mọi khoản thu chi' },
  { route: 'Categories', title: 'Danh mục', subtitle: 'Tạo, đổi tên và sắp xếp giao dịch theo danh mục' },
  { route: 'Cashflow', title: 'Dòng tiền & Tài sản', subtitle: 'Chuyển ví, đầu tư, tài sản ròng' },
  { route: 'Recurring', title: 'Chi phí cố định', subtitle: 'Hóa đơn định kỳ và nhắc nhở' },
  { route: 'Goals', title: 'Mục tiêu tài chính', subtitle: 'Lập kế hoạch và theo dõi tiến độ' },
  { route: 'Export', title: 'Xuất & Sao lưu', subtitle: 'CSV, PDF, sao lưu dữ liệu' },
];

// Render menu công cụ và chuyển route được khai báo trong cùng stack “Khác”.
export default function MoreScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Screen scroll padded={false} edges={['top']}>
      <AppHeader title="Khác" subtitle="Công cụ & Cài đặt" />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}>
        <Text style={{ ...theme.typo.label, color: c.textMuted, marginBottom: 8, marginLeft: 4 }}>QUẢN LÝ</Text>
        <View style={{ backgroundColor: c.surface, borderRadius: theme.radius.lg, paddingHorizontal: 12, overflow: 'hidden' }}>
          {TOOLS.map((t) => (
            <ListRow
              key={t.route}
              title={t.title}
              subtitle={t.subtitle}
              onPress={() => navigation.navigate(t.route)}
            />
          ))}
        </View>

        <Text style={{ ...theme.typo.label, color: c.textMuted, marginTop: 24, marginBottom: 8, marginLeft: 4 }}>
          HỆ THỐNG
        </Text>
        <View style={{ backgroundColor: c.surface, borderRadius: theme.radius.lg, paddingHorizontal: 12, overflow: 'hidden' }}>
          <ListRow
            title="Cài đặt"
            subtitle="Giao diện, trợ lý AI, thông tin"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </View>
    </Screen>
  );
}
