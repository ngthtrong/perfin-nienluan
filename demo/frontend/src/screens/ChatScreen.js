import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
  Alert, ScrollView, Animated,
} from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api.service';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';
import TransactionPreviewCard from '../components/TransactionPreviewCard';
import AppIcon from '../components/AppIcon';

const FALLBACK_AI_CONFIG = {
  models: {
    gemini: { status: 'unavailable', selected: 'gemini-3.1-flash-lite', models: ['gemini-3.1-flash-lite'] },
    local: { status: 'available', selected: 'local', models: ['local'] },
  },
  status: {
    selected_provider: 'gemini',
    selected_models: { gemini: 'gemini-3.1-flash-lite' },
  },
};

// ── Provider chip labels & icons ─────────────────────────────────────────────
const PROVIDER_META = {
  gemini:  { label: 'Gemini',  icon: 'auto-awesome' },
  local:   { label: 'Local',   icon: 'memory' },
};

// ── Typing dots animation ────────────────────────────────────────────────────
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      ).start();
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const dotStyle = (dot) => ({
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: COLORS.muted,
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={styles.typingBubble}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}

// ── Recording pulse animation ─────────────────────────────────────────────────
function RecordingPulse() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.recordingOverlay}>
      <Animated.View style={[styles.pulseBg, { transform: [{ scale: pulse }] }]} />
      <View style={styles.pulseIcon}>
        <AppIcon name="mic" size={28} color="#fff" />
      </View>
      <Text style={styles.recordingLabel}>Đang ghi âm...</Text>
      <Text style={styles.recordingHint}>Nhấn nút mic để dừng</Text>
    </View>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [aiConfig, setAIConfig] = useState(null);
  const [aiLoading, setAILoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [imageLoading, setImageLoading] = useState(false); // separate image state
  const listRef = useRef(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const isRecording = recorderState.isRecording;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { loadHistory(); loadAIModels(); }, []);
  useEffect(() => { if (messages.length > 0) scrollToBottom(); }, [messages.length]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const historyRes = await fetch(`${api.getBaseUrl()}/api/chat/messages?limit=20`);
      if (historyRes.ok) {
        const data = await historyRes.json();
        const history = (data.data || []).reverse().map((msg) => ({
          id: msg.id,
          role: msg.role,
          type: msg.metadata?.type || 'text',
          text: msg.content,
          transaction: msg.metadata?.transaction,
        }));
        // REQ-08: proactive bill reminders surfaced when opening chat
        const reminders = (data.reminders || []).map((r, idx) => ({
          id: `reminder-${idx}-${Date.now()}`,
          role: 'assistant',
          type: 'text',
          text: r.message,
        }));
        const combined = [...history, ...reminders];
        if (combined.length > 0) {
          setMessages(combined);
          setHistoryLoading(false);
          return;
        }
      }
    } catch (_) {}
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      type: 'text',
      text: 'Xin chào! Mình là PERFIN 👋\nHãy nhắn khoản thu chi như "ăn phở 50k" hay chụp hóa đơn để mình ghi nhận nhé!',
    }]);
    setHistoryLoading(false);
  }

  function push(message) {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...message }]);
  }

  async function loadAIModels() {
    setAILoading(true);
    try {
      const response = await api.getAIModels();
      setAIConfig({ models: response.data, status: response.status });
    } catch (error) {
      setAIConfig(FALLBACK_AI_CONFIG);
    } finally {
      setAILoading(false);
    }
  }

  async function selectAI(provider, model) {
    if (aiLoading) return;
    setAILoading(true);
    try {
      const response = await api.setAISelection({ provider, model });
      setAIConfig((prev) => ({ ...prev, status: response.data }));
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setAILoading(false);
    }
  }

  async function send(textOverride) {
    const text = (textOverride || input).trim();
    if (!text || (loading && !textOverride)) return;
    if (!textOverride) setInput('');
    push({ role: 'user', type: 'text', text });
    setLoading(true);
    try {
      const response = await api.sendChat(text);
      const data = response.data;
      push({ role: 'assistant', type: data.type, text: data.message, transaction: data.transaction });
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleMediaResult(response, sourceLabel) {
    const cleanText = String(response?.text || '').replace(/^MOCK_[A-Z_]+:\s*/i, '').trim();
    if (response?.provider === 'mock') {
      push({ role: 'system', type: 'text', text: `${sourceLabel}: đang dùng dữ liệu mẫu (provider chưa cấu hình).` });
    }
    if (!cleanText) {
      push({ role: 'system', type: 'text', text: `${sourceLabel} không có nội dung để xử lý.` });
      return;
    }
    push({ role: 'system', type: 'text', text: `${sourceLabel}: ${cleanText}` });
    // Backend already extracted a transaction; send the text through chat to create the
    // confirmable preview (reuses the pending-transaction flow).
    await send(cleanText);
  }

  async function startRecording() {
    if (loading || isRecording) return;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền micro', 'Hãy cấp quyền micro để nhập giao dịch bằng giọng nói.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    }
  }

  async function stopRecording() {
    if (!isRecording) return;
    setLoading(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri || recorder.getStatus().url;
      if (!uri) throw new Error('Không lấy được file ghi âm');
      const response = await api.transcribeAudio({
        uri,
        fileName: 'voice.m4a',
        mimeType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
      });
      await handleMediaResult(response, 'Giọng nói');
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function pickImage(useCamera) {
    if (loading) return;
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền truy cập', useCamera
          ? 'Hãy cấp quyền camera để chụp hóa đơn.'
          : 'Hãy cấp quyền thư viện ảnh để chọn hóa đơn.');
        return;
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;

      setImageLoading(true);
      const asset = result.assets[0];
      // Show image message in chat
      push({
        role: 'user',
        type: 'image',
        text: useCamera ? '📸 Đã chụp ảnh hóa đơn' : '🖼️ Đã chọn ảnh hóa đơn',
        imageUri: asset.uri,
      });
      const response = await api.extractImageText(asset);
      await handleMediaResult(response, 'Ảnh hóa đơn');
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setImageLoading(false);
    }
  }

  async function confirm() {
    const response = await api.confirmChat();
    push({ role: 'system', type: 'text', text: response.data.message });
  }

  async function cancel() {
    const response = await api.cancelChat();
    push({ role: 'system', type: 'text', text: response.data.message });
  }

  async function edit(data) {
    const response = await api.editChat(data);
    push({ role: 'assistant', type: response.data.type, text: response.data.message, transaction: response.data.transaction });
  }

  const renderItem = ({ item }) => {
    if (item.type === 'transaction_preview') {
      return <TransactionPreviewCard transaction={item.transaction} onConfirm={confirm} onCancel={cancel} onEdit={edit} />;
    }
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMsgWrap}>
          <View style={styles.systemMsg}>
            <AppIcon name="info-outline" size={12} color={COLORS.warning} />
            <Text style={styles.systemMsgText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <AppIcon name="auto-awesome" size={12} color="#fff" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {item.type === 'image' && (
            <View style={styles.imageTag}>
              <AppIcon name="image" size={14} color={COLORS.primary} />
              <Text style={styles.imageTagText}>Ảnh hóa đơn</Text>
            </View>
          )}
          <Text style={isUser ? styles.userText : styles.aiText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const selectedProvider = aiConfig?.status?.selected_provider || 'local';
  const currentModels = aiConfig?.models?.[selectedProvider]?.models || [];
  const selectedModel = aiConfig?.status?.selected_models?.[selectedProvider] || selectedProvider;

  const isLoadingAny = loading || imageLoading;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* AI Model Panel (collapsible) */}
      <TouchableOpacity style={styles.aiPanelToggle} onPress={() => setShowAiPanel((v) => !v)} activeOpacity={0.8}>
        <View style={styles.aiPanelToggleLeft}>
          <View style={[styles.providerDot, { backgroundColor: COLORS.income }]} />
          <Text style={styles.aiPanelToggleText}>
            {PROVIDER_META[selectedProvider]?.label} · {selectedModel}
          </Text>
        </View>
        <AppIcon name={showAiPanel ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={18} color={COLORS.muted} />
      </TouchableOpacity>

      {showAiPanel && (
        <View style={styles.aiPanel}>
          <View style={styles.providerRow}>
            {['gemini', 'local'].map((provider) => {
              const info = aiConfig?.models?.[provider];
              const disabled = provider !== 'local' && info?.status !== 'available';
              const active = selectedProvider === provider;
              const meta = PROVIDER_META[provider];
              return (
                <TouchableOpacity
                  key={provider}
                  disabled={disabled || aiLoading}
                  style={[styles.providerChip, active && styles.providerChipActive, disabled && styles.disabled]}
                  onPress={() => selectAI(provider)}
                >
                  <AppIcon name={meta.icon} size={14} color={active ? COLORS.primary : COLORS.muted} />
                  <Text style={[styles.providerChipText, active && styles.providerChipTextActive]}>
                    {meta.label}
                  </Text>
                  <View style={[styles.statusDot, { backgroundColor: info?.status === 'available' ? COLORS.income : COLORS.muted }]} />
                </TouchableOpacity>
              );
            })}
          </View>
          {currentModels.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modelRow}>
              {currentModels.map((model) => (
                <TouchableOpacity
                  key={model}
                  disabled={aiLoading || selectedProvider === 'local'}
                  style={[styles.modelChip, selectedModel === model && styles.modelChipActive]}
                  onPress={() => selectAI(selectedProvider, model)}
                >
                  <Text style={[styles.modelChipText, selectedModel === model && styles.modelChipTextActive]} numberOfLines={1}>
                    {model}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Message list */}
      {historyLoading ? (
        <View style={styles.historyLoading}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={styles.historyLoadingText}>Đang tải lịch sử...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={scrollToBottom}
          removeClippedSubviews
          ListFooterComponent={isLoadingAny ? <TypingIndicator /> : null}
        />
      )}

      {/* Recording overlay (full-width banner) */}
      {isRecording && <RecordingPulse />}

      {/* Image loading banner */}
      {imageLoading && !isRecording && (
        <View style={styles.imageBanner}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={styles.imageBannerText}>Đang phân tích ảnh hóa đơn...</Text>
        </View>
      )}

      {/* Input area */}
      <View style={styles.inputArea}>
        {/* Action buttons row */}
        <View style={styles.inputRow}>
          {/* Voice button */}
          <TouchableOpacity
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isLoadingAny && !isRecording}
            activeOpacity={0.75}
          >
            <AppIcon name={isRecording ? 'stop' : 'mic'} size={20} color={isRecording ? '#fff' : COLORS.primary} />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            style={[styles.input, isRecording && styles.inputHidden]}
            value={input}
            onChangeText={setInput}
            placeholder="Nhập giao dịch..."
            placeholderTextColor={COLORS.muted}
            onSubmitEditing={send}
            returnKeyType="send"
            editable={!isLoadingAny}
            multiline
          />

          {/* Camera & Gallery (shown when not recording, and text is empty) */}
          {!isRecording && !input.trim() && (
            <>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => pickImage(true)}
                disabled={isLoadingAny}
              >
                <AppIcon name="photo-camera" size={20} color={imageLoading ? COLORS.muted : COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => pickImage(false)}
                disabled={isLoadingAny}
              >
                <AppIcon name="image" size={20} color={imageLoading ? COLORS.muted : COLORS.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          {/* Send button (shown when there is text) */}
          {!isRecording && input.trim().length > 0 && (
            <TouchableOpacity style={styles.sendBtn} onPress={() => send()} disabled={isLoadingAny}>
              <AppIcon name="send" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── AI Panel ────────────────────────────────────────────────────────────────
  aiPanelToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  aiPanelToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  providerDot: { width: 7, height: 7, borderRadius: 3.5 },
  aiPanelToggleText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  aiPanel: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  providerRow: { flexDirection: 'row', gap: 8, paddingTop: 10 },
  providerChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  providerChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  providerChipText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  providerChipTextActive: { color: COLORS.primary },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  disabled: { opacity: 0.4 },
  modelRow: { paddingTop: 8, gap: 6 },
  modelChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modelChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modelChipText: { fontSize: 12, color: COLORS.muted },
  modelChipTextActive: { color: '#fff', fontWeight: '700' },

  // ── Loading ─────────────────────────────────────────────────────────────────
  historyLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  historyLoadingText: { color: COLORS.muted, fontSize: 14 },

  // ── Messages ────────────────────────────────────────────────────────────────
  list: { padding: 16, paddingBottom: 8 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },

  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    ...SHADOWS.sm,
  },

  bubble: {
    maxWidth: '78%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
    ...SHADOWS.sm,
  },
  aiBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  userText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  aiText: { color: COLORS.text, fontSize: 15, lineHeight: 21 },

  // Image bubble tag
  imageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  imageTagText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  // System message
  systemMsgWrap: { alignItems: 'center', marginBottom: 10 },
  systemMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  systemMsgText: { color: COLORS.warning, fontSize: 12, fontWeight: '600' },

  // Typing indicator
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 36,
    marginBottom: 12,
    ...SHADOWS.sm,
  },

  // ── Recording overlay ────────────────────────────────────────────────────────
  recordingOverlay: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFF0F3',
    borderTopWidth: 1,
    borderTopColor: '#FECDD3',
  },
  pulseBg: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.expense,
    opacity: 0.15,
  },
  pulseIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.expense,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...SHADOWS.md,
  },
  recordingLabel: { fontSize: 14, fontWeight: '800', color: COLORS.expense },
  recordingHint: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  // ── Image loading banner ────────────────────────────────────────────────────
  imageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  imageBannerText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // ── Input area ──────────────────────────────────────────────────────────────
  inputArea: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...SHADOWS.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },

  // Mic button
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  micBtnActive: {
    backgroundColor: COLORS.expense,
    borderColor: COLORS.expense,
    ...SHADOWS.md,
  },

  // Text input
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  inputHidden: { display: 'none' },

  // Camera / Gallery icon buttons
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },

  // Send button
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
});
