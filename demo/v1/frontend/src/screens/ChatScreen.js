import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api.service';
import { COLORS } from '../utils/constants';
import TransactionPreviewCard from '../components/TransactionPreviewCard';

export default function ChatScreen() {
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', type: 'text', text: 'Chào bạn! Hãy nhắn khoản thu chi như "ăn phở 50k" để PERFIN ghi nhận.' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  function push(message) {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...message }]);
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
      push({ role: 'user', type: 'text', text: useCamera ? 'Đã chụp ảnh hóa đơn' : 'Đã chọn ảnh hóa đơn' });
      const response = await api.extractImageText(asset);
      await handleTranscribedText(response.text, 'Ảnh hóa đơn');
    } catch (error) {
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList data={messages} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.list} />
      {loading && <ActivityIndicator color={COLORS.primary} style={{ marginBottom: 8 }} />}
      <View style={styles.inputRow}>
        <TouchableOpacity style={[styles.iconButton, recorderState.isRecording && styles.recording]} onPress={recorderState.isRecording ? stopRecording : startRecording}>
          <Text style={styles.iconText}>{recorderState.isRecording ? '■' : '🎙'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => pickImage(true)}>
          <Text style={styles.iconText}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => pickImage(false)}>
          <Text style={styles.iconText}>🖼</Text>
        </TouchableOpacity>
        <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Nhập giao dịch..." onSubmitEditing={send} />
        <TouchableOpacity style={styles.send} onPress={send}><Text style={styles.sendText}>Gửi</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16 },
  bubble: { maxWidth: '82%', padding: 12, borderRadius: 8, marginBottom: 10 },
  userBubble: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: COLORS.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.border },
  systemBubble: { backgroundColor: '#FEF3C7', alignSelf: 'center' },
  text: { color: COLORS.text, fontSize: 15 },
  userText: { color: '#fff', fontSize: 15 },
  inputRow: { flexDirection: 'row', padding: 10, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 6 },
  recording: { borderColor: '#DC2626', backgroundColor: '#FEE2E2' },
  iconText: { fontSize: 18 },
  input: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
  send: { backgroundColor: COLORS.primary, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  sendText: { color: '#fff', fontWeight: '700' },
});
