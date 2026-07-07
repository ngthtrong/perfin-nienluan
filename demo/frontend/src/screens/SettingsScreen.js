import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { api } from '../services/api.service';
import { Screen, Card, SegmentedControl, SectionHeader } from '../components/ui';

const THEME_OPTIONS = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Hệ thống' },
];

export default function SettingsScreen() {
  const { theme, scheme, setScheme } = useTheme();
  const c = theme.colors;

  return (
    <Screen scroll edges={[]}>
      <SectionHeader title="Giao diện" />
      <Card style={{ marginBottom: 20 }}>
        <Text style={{ ...theme.typo.caption, color: c.textMuted, marginBottom: 10 }}>Chế độ hiển thị</Text>
        <SegmentedControl options={THEME_OPTIONS} value={scheme} onChange={setScheme} />
        <Text style={{ ...theme.typo.caption, color: c.textMuted, marginTop: 10 }}>
          "Hệ thống" tự đổi theo cài đặt sáng/tối của thiết bị.
        </Text>
      </Card>

      <SectionHeader title="Trợ lý AI" />
      <Card style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.income }} />
          <Text style={{ ...theme.typo.bodyStrong, color: c.text }}>AI đang hoạt động</Text>
        </View>
        <Text style={{ ...theme.typo.caption, color: c.textMuted, marginTop: 6 }}>
          Nhập giao dịch bằng văn bản, giọng nói hoặc chụp hóa đơn ngay trong tab Chat.
        </Text>
      </Card>

      <SectionHeader title="Thông tin" />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ ...theme.typo.body, color: c.textSecondary }}>Ứng dụng</Text>
          <Text style={{ ...theme.typo.bodyStrong, color: c.text }}>PERFIN</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ ...theme.typo.body, color: c.textSecondary }}>Phiên bản</Text>
          <Text style={{ ...theme.typo.bodyStrong, color: c.text }}>1.0.0</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ ...theme.typo.body, color: c.textSecondary }}>Máy chủ</Text>
          <Text style={{ ...theme.typo.caption, color: c.textMuted }} numberOfLines={1}>{api.getBaseUrl()}</Text>
        </View>
      </Card>
    </Screen>
  );
}
