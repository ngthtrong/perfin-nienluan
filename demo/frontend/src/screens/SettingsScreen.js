import { useEffect, useState } from 'react';
import { ActivityIndicator, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { api } from '../services/api.service';
import { showAlert } from '../utils/alerts';
import { HIT_SLOP } from '../theme/tokens';
import { Screen, Card, SegmentedControl, SectionHeader, Button } from '../components/ui';
import AppIcon from '../components/AppIcon';

// Suggested trait types the assistant understands. Users may also type any
// custom label; the backend stores traits as free-form key/value pairs and only
// feeds them to the LLM when personalization consent is enabled.
const TRAIT_SUGGESTIONS = [
  { type: 'muc_tieu', label: 'Mục tiêu tài chính' },
  { type: 'thoi_quen_chi_tieu', label: 'Thói quen chi tiêu' },
  { type: 'thu_nhap', label: 'Nguồn thu nhập' },
  { type: 'so_thich', label: 'Sở thích cá nhân' },
  { type: 'ghi_chu', label: 'Ghi chú khác' },
];

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

  const [consent, setConsent] = useState(false);
  const [traits, setTraits] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const [newTraitType, setNewTraitType] = useState('');
  const [newTraitValue, setNewTraitValue] = useState('');
  const [traitSaving, setTraitSaving] = useState(false);
  const [removingTrait, setRemovingTrait] = useState(null);

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

  useEffect(() => {
    let mounted = true;
    api.getPersonalizationProfile()
      .then((response) => {
        if (!mounted) return;
        setConsent(Boolean(response.data?.consent));
        setTraits(response.data?.traits || []);
        setProfileError(null);
      })
      .catch((error) => {
        if (mounted) setProfileError(error.message);
      })
      .finally(() => {
        if (mounted) setProfileLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  async function toggleConsent() {
    if (consentSaving) return;
    const next = !consent;
    setConsentSaving(true);
    try {
      const response = await api.setPersonalizationConsent(next);
      setConsent(Boolean(response.data?.consent));
      setProfileError(null);
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setConsentSaving(false);
    }
  }

  async function addTrait() {
    const type = newTraitType.trim();
    const value = newTraitValue.trim();
    if (!type || !value) {
      setProfileError('Nhập cả tên đặc điểm và nội dung.');
      return;
    }
    setTraitSaving(true);
    try {
      await api.upsertPersonalizationTrait(type, value);
      const refreshed = await api.getPersonalizationProfile();
      setTraits(refreshed.data?.traits || []);
      setNewTraitType('');
      setNewTraitValue('');
      setProfileError(null);
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setTraitSaving(false);
    }
  }

  async function doRemoveTrait(traitType) {
    setRemovingTrait(traitType);
    try {
      await api.deletePersonalizationTrait(traitType);
      setTraits((current) => current.filter((trait) => trait.trait_type !== traitType));
      setProfileError(null);
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setRemovingTrait(null);
    }
  }

  // Xoá đặc điểm là thao tác không hoàn tác được nên phải hỏi lại, giống mọi
  // thao tác xoá khác trong ứng dụng (giao dịch, danh mục, ngân sách...).
  function removeTrait(traitType, label) {
    if (removingTrait) return;
    showAlert(
      'Xoá đặc điểm?',
      `Xoá “${label}” khỏi hồ sơ cá nhân hoá? Trợ lý sẽ không dùng đặc điểm này nữa. Thao tác không thể hoàn tác.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xoá', style: 'destructive', onPress: () => doRemoveTrait(traitType) },
      ]
    );
  }

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

      <SectionHeader title="Cá nhân hóa" />
      <Card style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...theme.typo.bodyStrong, color: c.text }}>Ghi nhớ đặc điểm cá nhân</Text>
            <Text style={{ ...theme.typo.caption, color: c.textMuted, marginTop: 4 }}>
              Khi bật, PERFIN dùng các đặc điểm bạn cung cấp để tư vấn sát hơn. Tắt sẽ ngừng đưa các đặc điểm này vào trò chuyện.
            </Text>
          </View>
          {consentSaving
            ? <ActivityIndicator size="small" color={c.brand} />
            : <Switch
                value={consent}
                onValueChange={toggleConsent}
                trackColor={{ false: c.border, true: c.brand }}
                thumbColor={c.surface}
                accessibilityLabel="Bật tắt cá nhân hóa"
              />}
        </View>

        {profileLoading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 }}>
            <ActivityIndicator size="small" color={c.brand} />
            <Text style={{ ...theme.typo.caption, color: c.textMuted }}>Đang tải hồ sơ...</Text>
          </View>
        ) : consent ? (
          <View style={{ marginTop: 16 }}>
            <Text style={{ ...theme.typo.caption, color: c.textMuted, marginBottom: 10 }}>
              Đặc điểm đã lưu {traits.length > 0 ? `· ${traits.length}` : ''}
            </Text>

            {traits.length > 0 ? traits.map((trait) => {
              const suggestion = TRAIT_SUGGESTIONS.find((item) => item.type === trait.trait_type);
              const removing = removingTrait === trait.trait_type;
              return (
                <View
                  key={trait.trait_type}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 11,
                    borderRadius: theme.radius.md, borderWidth: 1, borderColor: c.border,
                    backgroundColor: c.surfaceAlt, marginBottom: 8,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ ...theme.typo.caption, color: c.textMuted }}>{suggestion?.label || trait.trait_type}</Text>
                    <Text style={{ ...theme.typo.body, color: c.text, marginTop: 2 }}>{trait.trait_value}</Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Xóa đặc điểm ${suggestion?.label || trait.trait_type}`}
                    onPress={() => removeTrait(trait.trait_type, suggestion?.label || trait.trait_type)}
                    disabled={Boolean(removingTrait)}
                    hitSlop={HIT_SLOP}
                    style={{ width: 34, height: 34, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center' }}
                  >
                    {removing
                      ? <ActivityIndicator size="small" color={c.expense} />
                      : <AppIcon name="delete-outline" size={18} color={c.expense} />}
                  </TouchableOpacity>
                </View>
              );
            }) : (
              <Text style={{ ...theme.typo.caption, color: c.textMuted, marginBottom: 12 }}>
                Chưa có đặc điểm nào. Thêm bên dưới để PERFIN hiểu bạn hơn.
              </Text>
            )}

            <View style={{ marginTop: 6, gap: 8 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {TRAIT_SUGGESTIONS.map((item) => {
                  const active = newTraitType === item.type;
                  return (
                    <TouchableOpacity
                      key={item.type}
                      onPress={() => setNewTraitType(item.type)}
                      style={{
                        paddingHorizontal: 11, paddingVertical: 7, borderRadius: theme.radius.pill,
                        borderWidth: 1.5, borderColor: active ? c.brand : c.border,
                        backgroundColor: active ? c.brandSoft : c.surfaceAlt,
                      }}
                    >
                      <Text style={{ ...theme.typo.caption, color: active ? c.brandText : c.textMuted, fontWeight: '700' }}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={{
                  borderWidth: 1.5, borderColor: c.border, borderRadius: theme.radius.md,
                  padding: 12, fontSize: 14, color: c.text, backgroundColor: c.surfaceAlt,
                }}
                value={newTraitType}
                onChangeText={setNewTraitType}
                placeholder="Tên đặc điểm (hoặc chọn gợi ý phía trên)"
                placeholderTextColor={c.textMuted}
              />
              <TextInput
                style={{
                  borderWidth: 1.5, borderColor: c.border, borderRadius: theme.radius.md,
                  padding: 12, fontSize: 14, color: c.text, backgroundColor: c.surfaceAlt,
                }}
                value={newTraitValue}
                onChangeText={setNewTraitValue}
                placeholder="Nội dung, ví dụ: muốn tiết kiệm 30% thu nhập"
                placeholderTextColor={c.textMuted}
                multiline
              />
              <Button label="Lưu đặc điểm" icon="add" size="sm" onPress={addTrait} loading={traitSaving} />
            </View>
          </View>
        ) : (
          <Text style={{ ...theme.typo.caption, color: c.textMuted, marginTop: 14 }}>
            Cá nhân hóa đang tắt. Dữ liệu đặc điểm sẽ không được đưa vào trò chuyện với trợ lý.
          </Text>
        )}

        {profileError && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12, padding: 9, borderRadius: theme.radius.sm, backgroundColor: c.warningSoft }}>
            <AppIcon name="info-outline" size={15} color={c.warning} />
            <Text style={{ ...theme.typo.caption, color: c.warning, flex: 1 }}>{profileError}</Text>
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
          <Text style={{ ...theme.typo.caption, color: c.textMuted, flex: 1, minWidth: 0, marginLeft: 16, textAlign: 'right' }} numberOfLines={1}>{api.getBaseUrl()}</Text>
        </View>
      </Card>
    </Screen>
  );
}
