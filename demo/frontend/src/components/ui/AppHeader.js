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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: c.bg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
        <View>
          <Text style={{ fontSize: 17, fontWeight: '900', color: c.text, letterSpacing: 1 }}>{title}</Text>
          <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600', marginTop: 1 }}>{subtitle}</Text>
        </View>
      </View>

      {right ?? (showAIStatus && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.income }} />
          <Text style={{ fontSize: 11, color: c.income, fontWeight: '700' }}>AI Online</Text>
        </View>
      ))}
    </View>
  );
}
