import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
  ScrollView, Animated, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api.service';
import { showAlert } from '../utils/alerts';
import { useTheme } from '../theme/ThemeContext';
import TransactionPreviewCard from '../components/TransactionPreviewCard';
import MultiTransactionPreviewCard from '../components/MultiTransactionPreviewCard';
import MediaConfirmationCard from '../components/MediaConfirmationCard';
import ChatImagePreview from '../components/ChatImagePreview';
import AppIcon from '../components/AppIcon';
import { AppHeader } from '../components/ui';

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

const PROVIDER_META = {
  gemini: { label: 'Gemini', icon: 'auto-awesome' },
  local: { label: 'Local', icon: 'memory' },
};

function TypingIndicator({ styles, color }) {
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
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: color,
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

function RecordingPulse({ styles, color }) {
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
      <Text style={[styles.recordingLabel, { color }]}>Đang ghi âm...</Text>
      <Text style={styles.recordingHint}>Nhấn nút mic để dừng</Text>
    </View>
  );
}

export default function ChatScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [aiConfig, setAIConfig] = useState(null);
  const [aiLoading, setAILoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [categories, setCategories] = useState([]);
  const [pendingActionId, setPendingActionId] = useState(null);
  const listRef = useRef(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const isRecording = recorderState.isRecording;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { loadHistory(); loadAIModels(); loadCategories(); }, []);
  useEffect(() => { if (messages.length > 0) scrollToBottom(); }, [messages.length]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const data = await api.getChatMessages(20);
      const history = (data.data || []).map((msg) => {
        const metadata = msg.metadata && typeof msg.metadata === 'object' && !Array.isArray(msg.metadata)
          ? msg.metadata
          : {};
        return {
          ...msg,
          ...metadata,
          metadata,
          id: msg.id,
          role: msg.role,
          type: metadata.type || msg.type || 'text',
          text: msg.content || metadata.message || msg.text || '',
        };
      });
      const reminders = (data.reminders || []).map((r, idx) => ({
        id: r.event_key || `reminder-${r.bill_id || idx}`,
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
    const id = `${Date.now()}-${Math.random()}`;
    setMessages((prev) => [...prev, { id, ...message }]);
    return id;
  }

  function updateMessage(id, updates) {
    setMessages((prev) => prev.map((message) => (
      message.id === id ? { ...message, ...updates } : message
    )));
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

  async function loadCategories() {
    try {
      const response = await api.getCategories();
      setCategories(response.data || []);
    } catch (_) {
      setCategories([]);
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

  async function send(textOverride, { pushUser = true } = {}) {
    const text = (textOverride || input).trim();
    if (!text || (loading && !textOverride)) return;
    if (!textOverride) setInput('');
    if (pushUser) push({ role: 'user', type: 'text', text });
    setLoading(true);
    try {
      const response = await api.sendChat(text);
      const data = response.data || {};
      push({ role: 'assistant', ...data, type: data.type || 'text', text: data.message || '' });
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    if (loading || isRecording) return;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showAlert('Cần quyền micro', 'Hãy cấp quyền micro để nhập giao dịch bằng giọng nói.');
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
        fileName: Platform.OS === 'web' ? 'voice.webm' : 'voice.m4a',
        mimeType: Platform.OS === 'web' ? 'audio/webm' : Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
      });
      const transcript = String(response.transcript || response.text || '').trim();
      if (!transcript) throw new Error('Giọng nói không có nội dung để xác nhận');
      if (response.requires_confirmation !== false) {
        push({
          role: 'assistant',
          type: 'voice_confirmation',
          text: transcript,
          transcript,
          provider: response.provider,
        });
      } else {
        push({ role: 'system', type: 'text', text: `Giọng nói: ${transcript}` });
        await send(transcript, { pushUser: false });
      }
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
        showAlert('Cần quyền truy cập', useCamera
          ? 'Hãy cấp quyền camera để chụp hóa đơn.'
          : 'Hãy cấp quyền thư viện ảnh để chọn hóa đơn.');
        return;
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const image = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType || null,
        fileName: asset.fileName || null,
        ...(asset.base64 ? { base64: asset.base64 } : {}),
      };
      setPendingImage({ asset, image, useCamera });
      setInput((current) => current.slice(0, 1000));
      setShowImageOptions(false);
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    }
  }

  async function sendImage(imageDraft, context = '') {
    if (!imageDraft || imageLoading || loading) return;
    let imageMessageId = null;
    let imageAnalyzed = false;
    const cleanContext = String(context || '').trim();
    const fallbackCaption = imageDraft.useCamera ? '📸 Ảnh hóa đơn đã chụp' : '🖼️ Ảnh hóa đơn đã chọn';
    setImageLoading(true);
    try {
      imageMessageId = push({
        role: 'user',
        type: 'image',
        text: cleanContext || fallbackCaption,
        context: cleanContext || null,
        imageUri: imageDraft.asset.uri,
        image: imageDraft.image,
        mediaStatus: 'analyzing',
      });
      const response = await api.extractImageText(imageDraft.asset, cleanContext);
      const extractedText = String(response.text || '').trim();
      if (!extractedText) throw new Error('Ảnh hóa đơn không có nội dung để xử lý');
      imageAnalyzed = true;
      updateMessage(imageMessageId, { mediaStatus: 'analyzed' });
      if (response.receipt_options) {
        push({
          role: 'assistant',
          type: 'receipt_confirmation',
          text: extractedText,
          context: response.context || cleanContext || null,
          receiptOptions: response.receipt_options,
          provider: response.provider,
        });
      } else if (response.data) {
        const data = response.data;
        push({
          role: 'assistant',
          ...data,
          type: data.type || 'clarification',
          text: data.message || 'Không trích xuất được giao dịch từ hóa đơn.',
        });
      } else {
        push({ role: 'system', type: 'text', text: 'Đã đọc nội dung hóa đơn. Mình đang tạo bản xem trước.' });
        await send(cleanContext ? `${cleanContext}\n${extractedText}` : extractedText, { pushUser: false });
      }
    } catch (error) {
      if (imageMessageId && !imageAnalyzed) updateMessage(imageMessageId, { mediaStatus: 'failed' });
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setImageLoading(false);
    }
  }

  async function submitComposer() {
    if (isLoadingAny) return;
    const text = input.trim();
    if (pendingImage) {
      const imageDraft = pendingImage;
      setPendingImage(null);
      setShowImageOptions(false);
      setInput('');
      await sendImage(imageDraft, text);
      return;
    }
    setShowImageOptions(false);
    await send();
  }

  async function confirm(messageId, pendingId) {
    if (pendingActionId) return;
    setPendingActionId(messageId);
    try {
      const response = await api.confirmChat(pendingId);
      updateMessage(messageId, { resolved: true });
      const data = response.data || {};
      push({ role: 'system', ...data, type: data.type || 'text', text: data.message || 'Đã xác nhận' });
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setPendingActionId(null);
    }
  }

  async function cancel(messageId, pendingId) {
    if (pendingActionId) return;
    setPendingActionId(messageId);
    try {
      const response = await api.cancelChat(pendingId);
      updateMessage(messageId, { resolved: true });
      push({ role: 'system', type: 'text', text: response.data?.message || 'Đã hủy' });
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setPendingActionId(null);
    }
  }

  async function edit(messageId, data, pendingId) {
    if (pendingActionId) return false;
    setPendingActionId(messageId);
    try {
      const response = await api.editChat({ ...data, ...(pendingId ? { pending_id: pendingId } : {}) });
      const updated = response.data || {};
      updateMessage(messageId, { ...updated, text: updated.message || '' });
      return true;
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
      return false;
    } finally {
      setPendingActionId(null);
    }
  }

  async function confirmVoice(messageId, transcript) {
    if (pendingActionId || !transcript) return;
    setPendingActionId(messageId);
    try {
      const response = await api.confirmSpeechTranscript(transcript);
      const data = response.data || {};
      const hasPreview = ['transaction_preview', 'transactions_preview'].includes(data.type);
      updateMessage(messageId, { text: response.transcript || transcript, resolved: hasPreview });
      push({
        role: 'assistant',
        ...data,
        type: data.type || 'clarification',
        text: data.message || 'Không trích xuất được giao dịch từ transcript đã xác nhận.',
      });
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setPendingActionId(null);
    }
  }

  async function confirmReceipt(messageId, text, mode, context = '') {
    if (pendingActionId) return;
    setPendingActionId(messageId);
    try {
      const response = await api.confirmReceiptText(text, mode, context);
      const data = response.data || {};
      const hasPreview = ['transaction_preview', 'transactions_preview'].includes(data.type);
      updateMessage(messageId, { resolved: hasPreview, selectedMode: hasPreview ? mode : null });
      push({
        role: 'assistant',
        ...data,
        type: data.type || 'clarification',
        text: data.message || 'Không trích xuất được giao dịch từ hóa đơn đã xác nhận.',
      });
    } catch (error) {
      push({ role: 'system', type: 'text', text: error.message });
    } finally {
      setPendingActionId(null);
    }
  }

  function dismissMedia(messageId) {
    updateMessage(messageId, { resolved: true, dismissed: true });
    push({ role: 'system', type: 'text', text: 'Đã bỏ qua nội dung nhận dạng.' });
  }

  const renderItem = ({ item }) => {
    if (item.type === 'transaction_preview') {
      return (
        <TransactionPreviewCard
          transaction={item.transaction}
          categories={categories}
          onConfirm={() => confirm(item.id, item.pending_id)}
          onCancel={() => cancel(item.id, item.pending_id)}
          onEdit={(updates) => edit(item.id, updates, item.pending_id)}
          busy={pendingActionId === item.id}
          resolved={item.resolved}
        />
      );
    }
    if (item.type === 'transactions_preview') {
      return (
        <MultiTransactionPreviewCard
          transactions={item.transactions}
          categories={categories}
          onConfirm={() => confirm(item.id, item.pending_id)}
          onCancel={() => cancel(item.id, item.pending_id)}
          onEdit={(index, updates) => edit(item.id, { index, transaction: updates }, item.pending_id)}
          busy={pendingActionId === item.id}
          resolved={item.resolved}
        />
      );
    }
    if (item.type === 'voice_confirmation') {
      return (
        <MediaConfirmationCard
          kind="voice"
          text={item.transcript || item.text}
          onConfirm={(transcript) => confirmVoice(item.id, transcript)}
          onCancel={() => dismissMedia(item.id)}
          busy={pendingActionId === item.id}
          resolved={item.resolved}
        />
      );
    }
    if (item.type === 'receipt_confirmation') {
      return (
        <MediaConfirmationCard
          kind="receipt"
          text={item.text}
          context={item.context}
          receiptOptions={item.receiptOptions}
          onConfirm={(mode) => confirmReceipt(item.id, item.text, mode, item.context)}
          onCancel={() => dismissMedia(item.id)}
          busy={pendingActionId === item.id}
          resolved={item.resolved}
        />
      );
    }
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMsgWrap}>
          <View style={styles.systemMsg}>
            <AppIcon name="info-outline" size={12} color={c.textMuted} />
            <Text style={styles.systemMsgText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <AppIcon name="auto-awesome" size={12} color={c.onBrand} />
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
          item.type === 'image' && styles.imageBubble,
        ]}>
          {item.type === 'image'
            ? <ChatImagePreview message={item} isUser={isUser} />
            : <Text style={isUser ? styles.userText : styles.aiText}>{item.text}</Text>}
        </View>
      </View>
    );
  };

  const selectedProvider = aiConfig?.status?.selected_provider || 'local';
  const currentModels = aiConfig?.models?.[selectedProvider]?.models || [];
  const selectedModel = aiConfig?.status?.selected_models?.[selectedProvider] || selectedProvider;
  const isLoadingAny = loading || imageLoading || Boolean(pendingActionId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        subtitle="Trò chuyện & nhập liệu"
        right={
          <TouchableOpacity style={styles.aiPill} onPress={() => setShowAiPanel((v) => !v)} activeOpacity={0.8}>
            <View style={[styles.providerDot, { backgroundColor: c.income }]} />
            <Text style={styles.aiPillText} numberOfLines={1}>{PROVIDER_META[selectedProvider]?.label}</Text>
            <AppIcon name={showAiPanel ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={16} color={c.textMuted} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                    style={[styles.providerChip, active && styles.providerChipActive, (disabled) && styles.disabled]}
                    onPress={() => selectAI(provider)}
                  >
                    <AppIcon name={meta.icon} size={14} color={active ? c.brandText : c.textMuted} />
                    <Text style={[styles.providerChipText, active && styles.providerChipTextActive]}>{meta.label}</Text>
                    <View style={[styles.statusDot, { backgroundColor: info?.status === 'available' ? c.income : c.textMuted }]} />
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

        {historyLoading ? (
          <View style={styles.historyLoading}>
            <ActivityIndicator color={c.brand} size="small" />
            <Text style={styles.historyLoadingText}>Đang tải lịch sử...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            onContentSizeChange={scrollToBottom}
            removeClippedSubviews
            ListFooterComponent={isLoadingAny ? <TypingIndicator styles={styles} color={c.textMuted} /> : null}
          />
        )}

        {isRecording && <RecordingPulse styles={styles} color={c.expense} />}

        {imageLoading && !isRecording && (
          <View style={styles.imageBanner}>
            <ActivityIndicator color={c.brand} size="small" />
            <Text style={styles.imageBannerText}>Đang phân tích ảnh hóa đơn...</Text>
          </View>
        )}

        <View style={styles.inputArea}>
          {pendingImage && !isRecording && (
            <View style={styles.attachmentDraft}>
              <Image
                accessibilityLabel="Ảnh hóa đơn đang chờ gửi"
                source={{ uri: pendingImage.image.uri }}
                style={styles.attachmentThumb}
                resizeMode="cover"
              />
              <View style={styles.attachmentCopy}>
                <Text style={styles.attachmentTitle}>Ảnh đã sẵn sàng</Text>
                <Text style={styles.attachmentHint} numberOfLines={2}>
                  {input.trim() || 'Thêm mô tả bên dưới để PERFIN hiểu đúng ngữ cảnh.'}
                </Text>
                <Text style={styles.attachmentMeta}>{input.length}/1.000 ký tự</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Bỏ ảnh đã chọn"
                accessibilityRole="button"
                onPress={() => setPendingImage(null)}
                style={styles.removeAttachment}
              >
                <AppIcon name="close" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {showImageOptions && !pendingImage && !isRecording && (
            <View style={styles.imageOptions}>
              <TouchableOpacity
                accessibilityLabel="Chụp ảnh hóa đơn"
                accessibilityRole="button"
                style={styles.imageOption}
                onPress={() => pickImage(true)}
              >
                <AppIcon name="photo-camera" size={18} color={c.brand} />
                <Text style={styles.imageOptionText}>Chụp ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Chọn ảnh hóa đơn từ thư viện"
                accessibilityRole="button"
                style={styles.imageOption}
                onPress={() => pickImage(false)}
              >
                <AppIcon name="image" size={18} color={c.brand} />
                <Text style={styles.imageOptionText}>Chọn từ thư viện</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={(isLoadingAny || pendingImage) && !isRecording}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={isRecording ? 'Dừng ghi âm' : 'Ghi âm giao dịch'}
            >
              <AppIcon name={isRecording ? 'stop' : 'mic'} size={20} color={isRecording ? c.onBrand : c.brand} />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, isRecording && styles.inputHidden]}
              value={input}
              onChangeText={setInput}
              maxLength={pendingImage ? 1000 : undefined}
              placeholder={pendingImage ? 'Mô tả thêm cho ảnh (không bắt buộc)...' : 'Nhập giao dịch...'}
              placeholderTextColor={c.textMuted}
              onSubmitEditing={submitComposer}
              returnKeyType="send"
              editable={!isLoadingAny}
              multiline
            />

            {!isRecording && !pendingImage && (
              <TouchableOpacity
                style={[styles.iconBtn, showImageOptions && styles.iconBtnActive]}
                onPress={() => setShowImageOptions((visible) => !visible)}
                disabled={isLoadingAny}
                accessibilityRole="button"
                accessibilityLabel="Thêm ảnh hóa đơn"
                accessibilityState={{ expanded: showImageOptions }}
              >
                <AppIcon name="add-photo-alternate" size={20} color={showImageOptions ? c.brand : c.textSecondary} />
              </TouchableOpacity>
            )}

            {!isRecording && (input.trim().length > 0 || pendingImage) && (
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={submitComposer}
                disabled={isLoadingAny}
                accessibilityRole="button"
                accessibilityLabel="Gửi tin nhắn"
              >
                <AppIcon name="send" size={18} color={c.onBrand} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.bg },

  aiPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: t.colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: t.radius.pill,
    borderWidth: 1, borderColor: t.colors.border, maxWidth: 130,
  },
  providerDot: { width: 7, height: 7, borderRadius: 3.5 },
  aiPillText: { fontSize: 12, color: t.colors.textSecondary, fontWeight: '700' },

  aiPanel: {
    width: '100%', maxWidth: 720, alignSelf: 'center',
    backgroundColor: t.colors.surface, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4,
    borderBottomWidth: 1, borderBottomColor: t.colors.border,
  },
  providerRow: { flexDirection: 'row', gap: 8, paddingTop: 10 },
  providerChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: t.radius.sm, backgroundColor: t.colors.surfaceAlt,
    borderWidth: 1.5, borderColor: t.colors.border,
  },
  providerChipActive: { borderColor: t.colors.brand, backgroundColor: t.colors.brandSoft },
  providerChipText: { fontSize: 12, fontWeight: '700', color: t.colors.textMuted },
  providerChipTextActive: { color: t.colors.brandText },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  disabled: { opacity: 0.4 },
  modelRow: { paddingTop: 8, gap: 6 },
  modelChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.border,
  },
  modelChipActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  modelChipText: { fontSize: 12, color: t.colors.textMuted },
  modelChipTextActive: { color: '#fff', fontWeight: '700' },

  historyLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  historyLoadingText: { color: t.colors.textMuted, fontSize: 14 },

  list: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: t.colors.brand,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2, ...t.shadows.sm,
  },
  bubble: { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  imageBubble: { width: '78%', maxWidth: 280, padding: 4, overflow: 'hidden' },
  userBubble: { backgroundColor: t.colors.chatUserBubble, borderBottomRightRadius: 4, ...t.shadows.sm },
  aiBubble: {
    backgroundColor: t.colors.chatAiBubble, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: t.colors.border, ...t.shadows.sm,
  },
  userText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  aiText: { color: t.colors.text, fontSize: 15, lineHeight: 21 },

  systemMsgWrap: { alignItems: 'center', marginBottom: 10 },
  systemMsg: {
    flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '90%',
    backgroundColor: t.colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 7, borderRadius: t.radius.pill,
    borderWidth: 1, borderColor: t.colors.border,
  },
  systemMsgText: { color: t.colors.textSecondary, fontSize: 12, fontWeight: '600' },

  typingBubble: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5,
    backgroundColor: t.colors.surface, paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: t.colors.border,
    marginLeft: 36, marginBottom: 12, ...t.shadows.sm,
  },

  recordingOverlay: {
    alignItems: 'center', paddingVertical: 16,
    backgroundColor: t.colors.expenseSoft, borderTopWidth: 1, borderTopColor: t.colors.expenseSoft,
  },
  pulseBg: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.expense, opacity: 0.15 },
  pulseIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: t.colors.expense,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10, ...t.shadows.md,
  },
  recordingLabel: { fontSize: 14, fontWeight: '800' },
  recordingHint: { fontSize: 12, color: t.colors.textMuted, marginTop: 2 },

  imageBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: t.colors.surfaceAlt, paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: t.colors.border,
  },
  imageBannerText: { fontSize: 13, color: t.colors.textSecondary, fontWeight: '600' },

  inputArea: {
    backgroundColor: t.colors.surface, borderTopWidth: 1, borderTopColor: t.colors.border,
    paddingHorizontal: 12, paddingVertical: 10, ...t.shadows.sm,
  },
  attachmentDraft: {
    width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 9, marginBottom: 8, borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.border,
  },
  attachmentThumb: { width: 56, height: 56, borderRadius: t.radius.sm, backgroundColor: t.colors.bg },
  attachmentCopy: { flex: 1, minWidth: 0 },
  attachmentTitle: { color: t.colors.text, fontSize: 13, fontWeight: '800' },
  attachmentHint: { color: t.colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  attachmentMeta: { color: t.colors.textMuted, fontSize: 9, fontWeight: '600', marginTop: 3 },
  removeAttachment: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 18, backgroundColor: t.colors.surface,
  },
  imageOptions: {
    width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', gap: 8,
    paddingBottom: 8,
  },
  imageOption: {
    flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  imageOptionText: { color: t.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  inputRow: { width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  micBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.brandSoft,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: t.colors.brand,
  },
  micBtnActive: { backgroundColor: t.colors.expense, borderColor: t.colors.expense, ...t.shadows.md },
  input: {
    flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: t.colors.surfaceAlt,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, fontSize: 15, color: t.colors.text,
    borderWidth: 1.5, borderColor: t.colors.border,
  },
  inputHidden: { display: 'none' },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: t.colors.border,
  },
  iconBtnActive: { borderColor: t.colors.brand, backgroundColor: t.colors.brandSoft },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.brand,
    alignItems: 'center', justifyContent: 'center', ...t.shadows.sm,
  },
});
