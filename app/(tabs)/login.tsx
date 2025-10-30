import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const LoginScreen: React.FC = () => {
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hardcoded credentials
  const ADMIN_PASSWORD = 'admin123';
  const USER_PASSWORD = 'user123';

  const handleLogin = (userType: 'user' | 'admin') => {
    const correctPassword = userType === 'admin' ? ADMIN_PASSWORD : USER_PASSWORD;
    
    if (password === correctPassword) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        if (userType === 'admin') {
          router.replace('/admin');
        } else {
          router.replace('/');
        }
      }, 1000);
    } else {
      Alert.alert('Error', 'Incorrect password!');
    }
  };

  const handleQuickAccess = () => {
    Alert.alert(
      'Quick Access',
      'Choose your access level:',
      [
        {
          text: 'User Access',
          onPress: () => router.replace('/')
        },
        {
          text: 'Admin Access',
          onPress: () => router.replace('/admin')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>🚨 Safe Route Finder</Text>
        <Text style={styles.subtitle}>Choose your access level</Text>

        <View style={styles.loginSection}>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.userButton]}
              onPress={() => handleLogin('user')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>👤 User Login</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.adminButton]}
              onPress={() => handleLogin('admin')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🛡️ Admin Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={handleQuickAccess} style={styles.quickAccessButton}>
          <Text style={styles.quickAccessText}>🚀 Quick Access (No Password)</Text>
        </TouchableOpacity>

        <View style={styles.hintSection}>
          <Text style={styles.hintTitle}>Password Hints:</Text>
          <Text style={styles.hint}>👤 User: user123</Text>
          <Text style={styles.hint}>🛡️ Admin: admin123</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 40,
    textAlign: 'center',
  },
  loginSection: {
    width: '100%',
    backgroundColor: '#2d2d2d',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#3d3d3d',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 10,
    padding: 15,
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  userButton: {
    backgroundColor: '#007AFF',
  },
  adminButton: {
    backgroundColor: '#FF6B35',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickAccessButton: {
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    marginBottom: 30,
  },
  quickAccessText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hintSection: {
    backgroundColor: '#2d2d2d',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  hintTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
});

export default LoginScreen;