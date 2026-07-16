import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

// Compact brand header for root tab screens: logo + title/subtitle, optional AI status + right node.
export default function AppHeader({ title = 'PERFIN', subtitle = 'Trợ lý tài chính AI', showAIStatus = true, right }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={{
        backgroundColor: c.bg,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <View style={{
        width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: c.brand,
              alignItems: 'center',
              justifyContent: 'center',
              ...theme.shadows.sm,
            }}
          >
            <MaterialIcons name="account-balance-wallet" size={18} color={c.onBrand} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '900', color: c.text, letterSpacing: 0.8 }}>{title}</Text>
            <Text numberOfLines={1} style={{ fontSize: 11, color: c.textMuted, fontWeight: '600', marginTop: 1 }}>{subtitle}</Text>
          </View>
        </View>

        {right ?? (showAIStatus && (
          <View style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.income }} />
            <Text numberOfLines={1} style={{ fontSize: 11, color: c.income, fontWeight: '700' }}>AI sẵn sàng</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
