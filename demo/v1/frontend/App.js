import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';

export default function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Make sure to replace YOUR_HOST_IP with your computer's actual Wi-Fi IP
    // For example: http://192.168.1.5:3000/api/test-db
    // You can also define EXPO_PUBLIC_API_URL in a .env file
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://seven-sheep-share.loca.lt/api/test-db';

    fetch(API_URL, {
      headers: {
        'Bypass-Tunnel-Reminder': 'true'
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.data.length > 0) {
          setMessage(data.data[0].message);
        } else {
          setMessage('No data found');
        }
      })
      .catch(error => {
        console.error(error);
        setMessage(`Error fetching data. Ensure backend is running and accessible. IP mismatch?`);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>React Native Expo App 🚀</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Backend Status:</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#0000ff" />
        ) : (
          <Text style={styles.message}>{message}</Text>
        )}
      </View>

      <Text style={styles.note}>
        NOTE: To test on iPhone via Expo Go, ensure this app connects to your computer's Wi-Fi IP address.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  message: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '500',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  }
});
