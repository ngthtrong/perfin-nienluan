import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

export default function App() {
  const [messages, setMessages] = useState([
    { id: '1', role: 'ai', text: 'Chào bạn, tôi là trợ lý AI PERFIN. Bạn có thể nhập text, gửi ảnh hóa đơn hoặc ghi âm để thêm giao dịch.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL 
    ? process.env.EXPO_PUBLIC_API_URL.replace('/api/test-db', '')
    : 'http://172.30.118.20:3000';

  useEffect(() => {
    // Request permissions
    (async () => {
      await Audio.requestPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), role, text }]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    addMessage('user', text);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });
      const data = await response.json();
      if (data.success) {
        addMessage('ai', data.text);
      } else {
        addMessage('system', `Error: ${data.error}`);
      }
    } catch (error) {
      addMessage('system', `Connection error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      addMessage('user', '[Đã gửi ảnh hóa đơn]');
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setLoading(true);
    let formData = new FormData();
    formData.append('image', {
      uri,
      name: 'receipt.jpg',
      type: 'image/jpeg',
    });

    try {
      const response = await fetch(`${API_URL}/api/ocr`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = await response.json();
      if (data.success) {
        addMessage('ai', `Kết quả quét OCR: ${data.text}`);
      } else {
        addMessage('system', `OCR Error: ${data.error}`);
      }
    } catch (error) {
      addMessage('system', `Upload error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      addMessage('system', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    
    addMessage('user', '[Đã gửi đoạn ghi âm]');
    uploadAudio(uri);
  };

  const uploadAudio = async (uri) => {
    setLoading(true);
    let formData = new FormData();
    formData.append('audio', {
      uri,
      name: 'voice.m4a',
      type: 'audio/m4a',
    });

    try {
      const response = await fetch(`${API_URL}/api/speech`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = await response.json();
      if (data.success) {
        addMessage('ai', `Kết quả nhận diện giọng nói: ${data.text}`);
      } else {
        addMessage('system', `Speech Error: ${data.error}`);
      }
    } catch (error) {
      addMessage('system', `Upload error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageBubble, 
      item.role === 'user' ? styles.userBubble : item.role === 'ai' ? styles.aiBubble : styles.sysBubble
    ]}>
      <Text style={item.role === 'user' ? styles.userText : styles.aiText}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PERFIN AI Chat</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
      />

      {loading && <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
          <Text style={styles.iconText}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.iconButton, recording && styles.recordingButton]} 
          onPress={recording ? stopRecording : startRecording}
        >
          <Text style={styles.iconText}>{recording ? '⏹️' : '🎤'}</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Nhập giao dịch..."
          placeholderTextColor="#999"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Gửi</Text>
        </TouchableOpacity>
      </View>
      
      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { 
    paddingTop: 50, paddingBottom: 15, backgroundColor: '#fff', 
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  chatContainer: { padding: 15, paddingBottom: 20 },
  messageBubble: { 
    maxWidth: '80%', padding: 12, borderRadius: 20, marginBottom: 10 
  },
  userBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  aiBubble: { backgroundColor: '#E5E5EA', alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  sysBubble: { backgroundColor: '#FFCC00', alignSelf: 'center', borderRadius: 10 },
  userText: { color: '#fff', fontSize: 16 },
  aiText: { color: '#000', fontSize: 16 },
  inputContainer: { 
    flexDirection: 'row', padding: 10, backgroundColor: '#fff', 
    borderTopWidth: 1, borderTopColor: '#ddd', alignItems: 'center' 
  },
  iconButton: {
    padding: 8, marginRight: 5, backgroundColor: '#E5E5EA', borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', width: 40, height: 40
  },
  recordingButton: {
    backgroundColor: '#FF3B30'
  },
  iconText: { fontSize: 18 },
  input: { 
    flex: 1, backgroundColor: '#F2F2F7', borderRadius: 20, 
    paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, marginRight: 10 
  },
  sendButton: { 
    backgroundColor: '#007AFF', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loader: { marginBottom: 10 }
});
