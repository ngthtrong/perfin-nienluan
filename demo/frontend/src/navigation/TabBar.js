import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const ICONS = {
  Dashboard: 'space-dashboard',
  Chat: 'auto-awesome',
  Budget: 'account-balance-wallet',
  Report: 'bar-chart',
  More: 'grid-view',
};

const LABELS = {
  Dashboard: 'Tổng quan',
  Chat: 'Chat',
  Budget: 'Ngân sách',
  Report: 'Báo cáo',
  More: 'Khác',
};

export default function TabBar({ state, navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const isChat = route.name === 'Chat';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        // Center Chat tab: prominent floating brand button
        if (isChat) {
          return (
            <TouchableOpacity key={route.key} style={styles.item} onPress={onPress} activeOpacity={0.85}>
              <View style={[styles.chatButton, { backgroundColor: c.brand }, theme.shadows.md]}>
                <MaterialIcons name={ICONS.Chat} size={26} color={c.onBrand} />
              </View>
              <Text style={[styles.label, { color: focused ? c.brandText : c.textMuted, marginTop: 4 }]}>
                {LABELS.Chat}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={route.key} style={styles.item} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.iconWrap, focused && { backgroundColor: c.brandSoft }]}>
              <MaterialIcons name={ICONS[route.name]} size={22} color={focused ? c.brandText : c.textMuted} />
            </View>
            <Text style={[styles.label, { color: focused ? c.brandText : c.textMuted }]}>
              {LABELS[route.name]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: {
    width: 46,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  label: { fontSize: 10, fontWeight: '700' },
});
