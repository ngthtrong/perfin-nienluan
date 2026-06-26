import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Alert, ScrollView, Keyboard } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api.service';
import { COLORS } from '../utils/constants';
import TransactionPreviewCard from '../components/TransactionPreviewCard';
import AppIcon from '../components/AppIcon';

const FALLBACK_AI_CONFIG = {
  models: {
    gemini: { status: 'unavailable', selected: 'gemini-2.5-flash', models: ['gemini-2.5-flash'] },
    chatgpt: { status: 'unavailable', selected: 'gpt-4o-mini', models: ['gpt-4o-mini'] },
    local: { status: 'available', selected: 'local', models: ['local'] },
  },
  status: {
    selected_provider: 'local',
    selected_models: { gemini: 'gemini-2.5-flash', chatgpt: 'gpt-4o-mini' },
  },
};

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [aiConfig, setAIConfig] = useState(null);
  const [aiLoading, setAILoading] = useState(false);
  const listRef = useRef(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    loadHistory();
    loadAIModels();
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      // Thử load history từ API
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
        if (history.length > 0) {
          setMessages(history);
          setHistoryLoading(false);
          return;
        }
      }
    } catch (_) {}
    // Nếu không có history, hiện welcome message
    setMessages([{ id: 'welcome', role: 'assistant', type: 'text', text: 'Chào bạn! Mình là PERFIN, trợ lý tài chính cá nhân. Hãy nhắn khoản thu chi như "ăn phở 50k" để mình ghi nhận nhé!' }]);
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
      console.warn(`[ChatScreen] AI model config unavailable: ${error.message}`);
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
      console.warn(`[ChatScreen] speech failed: ${error.message}`);
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleTranscribedText(text, sourceLabel) {
    const cleanText = String(text || '').replace(/^MOCK_[A-Z_]+:\s*/i, '').trim();
    if (!cleanText) {
      push({ role: 'system', type: 'text', text: `${sourceLabel} không có nội dung để xử lý.` });
      return;
    }
    push({ role: 'system', type: 'text', text: `${sourceLabel}: ${cleanText}` });
    await send(cleanText);
  }

  async function startRecording() {
    if (loading || recorderState.isRecording) return;
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
    if (!recorderState.isRecording) return;
    setLoading(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri || recorder.getStatus().url;
      if (!uri) throw new Error('Không lấy được file ghi âm');
      console.log(`[ChatScreen] audio recorded: ${uri}`);
      const response = await api.transcribeAudio({ uri, fileName: 'voice.m4a', mimeType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4' });
      await handleTranscribedText(response.text, 'Giọng nói');
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
        Alert.alert('Cần quyền truy cập', useCamera ? 'Hãy cấp quyền camera để chụp hóa đơn.' : 'Hãy cấp quyền thư viện ảnh để chọn hóa đơn.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;

      setLoading(true);
      const asset = result.assets[0];
      console.log(`[ChatScreen] image selected: ${asset.fileName || asset.uri} (${asset.mimeType || 'unknown'})`);
      push({ role: 'user', type: 'text', text: useCamera ? 'Đã chụp ảnh hóa đơn' : 'Đã chọn ảnh hóa đơn' });
      const response = await api.extractImageText(asset);
      await handleTranscribedText(response.text, 'Ảnh hóa đơn');
    } catch (error) {
      console.warn(`[ChatScreen] image failed: ${error.message}`);
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setLoading(false);
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
    if (item.type === 'transaction_preview') return <TransactionPreviewCard transaction={item.transaction} onConfirm={confirm} onCancel={cancel} onEdit={edit} />;
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : isSystem ? styles.systemBubble : styles.aiBubble]}>
        <Text style={isUser ? styles.userText : styles.text}>{item.text}</Text>
      </View>
    );
  };

  const selectedProvider = aiConfig?.status?.selected_provider || 'local';
  const currentModels = aiConfig?.models?.[selectedProvider]?.models || [];
  const selectedModel = aiConfig?.status?.selected_models?.[selectedProvider] || selectedProvider;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.aiPanel}>
        <View style={styles.providerRow}>
          {['gemini', 'chatgpt', 'local'].map((provider) => {
            const info = aiConfig?.models?.[provider];
            const disabled = provider !== 'local' && info?.status !== 'available';
            const active = selectedProvider === provider;
            return (
              <TouchableOpacity key={provider} disabled={disabled || aiLoading} style={[styles.providerButton, active && styles.providerActive, disabled && styles.disabled]} onPress={() => selectAI(provider)}>
                <Text style={[styles.providerText, active && styles.providerTextActive]}>{provider === 'chatgpt' ? 'ChatGPT' : provider === 'gemini' ? 'Gemini' : 'Local'}</Text>
                <Text style={styles.providerStatus}>{info?.status || 'loading'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modelRow}>
          {currentModels.map((model) => (
            <TouchableOpacity key={model} disabled={aiLoading || selectedProvider === 'local'} style={[styles.modelButton, selectedModel === model && styles.modelActive]} onPress={() => selectAI(selectedProvider, model)}>
              <Text style={[styles.modelText, selectedModel === model && styles.modelTextActive]} numberOfLines={1}>{model}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
        />
      )}
      {loading && <ActivityIndicator color={COLORS.primary} style={{ marginBottom: 8 }} />}
      <View style={styles.inputRow}>
        <TouchableOpacity style={[styles.iconButton, recorderState.isRecording && styles.recording]} onPress={recorderState.isRecording ? stopRecording : startRecording}>
          <AppIcon name={recorderState.isRecording ? 'stop' : 'mic'} size={20} color={recorderState.isRecording ? COLORS.expense : COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => pickImage(true)}>
          <AppIcon name="photo-camera" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => pickImage(false)}>
          <AppIcon name="image" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Nhập giao dịch..."
          placeholderTextColor={COLORS.muted}
          onSubmitEditing={send}
          returnKeyType="send"
          editable={!loading}
        />
        <TouchableOpacity style={styles.send} onPress={send}><Text style={styles.sendText}>Gửi</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  historyLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  historyLoadingText: { color: COLORS.muted, fontSize: 14 },
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16 },
  aiPanel: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 8 },
  providerRow: { flexDirection: 'row' },
  providerButton: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 8, marginHorizontal: 3, backgroundColor: COLORS.background },
  providerActive: { borderColor: COLORS.primary, backgroundColor: '#DBEAFE' },
  disabled: { opacity: 0.45 },
  providerText: { color: COLORS.text, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  providerTextActive: { color: COLORS.primary },
  providerStatus: { color: COLORS.muted, fontSize: 10, textAlign: 'center', marginTop: 2 },
  modelRow: { paddingTop: 8, paddingHorizontal: 3 },
  modelButton: { maxWidth: 180, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, backgroundColor: COLORS.background },
  modelActive: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  modelText: { color: COLORS.muted, fontSize: 12 },
  modelTextActive: { color: COLORS.primary, fontWeight: '800' },
  bubble: { maxWidth: '82%', padding: 12, borderRadius: 8, marginBottom: 10 },
  userBubble: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: COLORS.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.border },
  systemBubble: { backgroundColor: '#FEF3C7', alignSelf: 'center' },
  text: { color: COLORS.text, fontSize: 15 },
  userText: { color: '#fff', fontSize: 15 },
  inputRow: { flexDirection: 'row', padding: 10, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 6 },
  recording: { borderColor: '#DC2626', backgroundColor: '#FEE2E2' },
  input: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
  send: { backgroundColor: COLORS.primary, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  sendText: { color: '#fff', fontWeight: '700' },
});
