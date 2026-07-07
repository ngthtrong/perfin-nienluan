import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

// Screen wrapper: theme background + safe area. Set `scroll` for a padded ScrollView body,
// or pass children directly for custom layouts (e.g. FlatList / KeyboardAvoidingView).
export default function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  contentContainerStyle,
  refreshControl,
  style,
}) {
  const { theme } = useTheme();
  const bg = { flex: 1, backgroundColor: theme.colors.bg };

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[padded && styles.padded, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && styles.padded, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[bg, style]} edges={edges}>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16, paddingBottom: 32 },
});
