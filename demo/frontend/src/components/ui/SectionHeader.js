import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

// Section title with optional trailing action ("Xem tất cả").
export default function SectionHeader({ title, actionLabel, onAction, style }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
        style,
      ]}
    >
      <Text style={{ ...theme.typo.heading, color: c.text }}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ color: c.brandText, fontWeight: '700', fontSize: 13 }}>{actionLabel}</Text>
          <MaterialIcons name="chevron-right" size={16} color={c.brandText} />
        </TouchableOpacity>
      )}
    </View>
  );
}
