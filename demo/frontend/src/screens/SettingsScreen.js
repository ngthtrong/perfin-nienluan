import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { api } from '../services/api.service';
import { Screen, Card, SegmentedControl, SectionHeader } from '../components/ui';
import AppIcon from '../components/AppIcon';

const THEME_OPTIONS = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Hệ thống' },
];

export default function SettingsScreen() {
  const { theme, scheme, setScheme } = useTheme();
  const c = theme.colors;
  const [personas, setPersonas] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState(null);
  const [personaLoading, setPersonaLoading] = useState(true);
  const [savingPersonaId, setSavingPersonaId] = useState(null);
  const [personaError, setPersonaError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getPersonas()
      .then((response) => {
        if (!mounted) return;
        const available = response.data || [];
        setPersonas(available);
        setActivePersonaId(response.active?.id || available.find((persona) => persona.is_default)?.id || null);
        setPersonaError(null);
      })
      .catch((error) => {
        if (mounted) setPersonaError(error.message);
      })
      .finally(() => {
        if (mounted) setPersonaLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  async function selectPersona(persona) {
    if (savingPersonaId || Number(persona.id) === Number(activePersonaId)) return;
    setSavingPersonaId(persona.id);
    try {
      const response = await api.setActivePersona(persona.id);
      setActivePersonaId(response.data?.id || persona.id);
      setPersonaError(null);
    } catch (error) {
      setPersonaError(error.message);
    } finally {
      setSavingPersonaId(null);
    }
  }

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

      <SectionHeader title="Phong cách tư vấn" />
      <Card style={{ marginBottom: 20 }}>
        <Text style={{ ...theme.typo.caption, color: c.textMuted, marginBottom: 12 }}>
          Chọn cách PERFIN diễn giải báo cáo, cảnh báo và trò chuyện với bạn.
        </Text>

        {personaLoading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 }}>
            <ActivityIndicator size="small" color={c.brand} />
            <Text style={{ ...theme.typo.caption, color: c.textMuted }}>Đang tải phong cách...</Text>
          </View>
        ) : personas.length > 0 ? personas.map((persona, index) => {
          const active = Number(persona.id) === Number(activePersonaId);
          const saving = Number(persona.id) === Number(savingPersonaId);
          return (
            <TouchableOpacity
              key={persona.id}
              onPress={() => selectPersona(persona)}
              disabled={Boolean(savingPersonaId)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11,
                paddingHorizontal: 11, borderRadius: theme.radius.md,
                borderWidth: 1.5, borderColor: active ? c.brand : c.border,
                backgroundColor: active ? c.brandSoft : c.surfaceAlt,
                marginBottom: index === personas.length - 1 ? 0 : 8,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: active ? c.brand : c.surface,
              }}>
                <AppIcon
                  name={persona.key === 'strict' ? 'rule' : persona.key === 'friendly' ? 'sentiment-satisfied' : 'psychology'}
                  size={18}
                  color={active ? c.onBrand : c.brandText}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...theme.typo.bodyStrong, color: active ? c.brandText : c.text }}>{persona.name}</Text>
                <Text style={{ ...theme.typo.caption, color: c.textMuted, marginTop: 2 }} numberOfLines={2}>
                  {persona.description || 'Phong cách trợ lý tài chính cá nhân.'}
                </Text>
              </View>
              {saving
                ? <ActivityIndicator size="small" color={c.brand} />
                : <AppIcon name={active ? 'check-circle' : 'radio-button-unchecked'} size={20} color={active ? c.brand : c.textMuted} />}
            </TouchableOpacity>
          );
        }) : (
          <Text style={{ ...theme.typo.caption, color: c.textMuted }}>Chưa có phong cách tư vấn khả dụng.</Text>
        )}

        {personaError && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, padding: 9, borderRadius: theme.radius.sm, backgroundColor: c.warningSoft }}>
            <AppIcon name="info-outline" size={15} color={c.warning} />
            <Text style={{ ...theme.typo.caption, color: c.warning, flex: 1 }}>{personaError}</Text>
          </View>
        )}
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
