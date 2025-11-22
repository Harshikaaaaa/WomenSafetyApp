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
import { supabase, SUPABASE_URL } from '../../utils/supabase';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);

      // Debug: log endpoint so you can verify it's the expected supabase project
      console.log('Attempting sign-in to Supabase URL:', SUPABASE_URL);

      const res = await supabase.auth.signInWithPassword({ email, password });
      setIsLoading(false);

      if (res.error) {
        console.error('Supabase signIn error object:', res.error);
        Alert.alert('Login failed', res.error.message || 'Unknown error');
        return;
      }

      // On success, route based on the signed-in user's email.
      const signedInEmail = (res.data as any)?.user?.email || email;
      if (signedInEmail === 'admin@app.com') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setIsLoading(false);
      // Log full error for debugging network issues
      console.error('Sign-in threw:', err);
      Alert.alert('Login error', err.message || String(err));
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>🚨 Safe Route Finder</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.loginSection}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? 'Signing in...' : 'Login'}</Text>
          </TouchableOpacity>
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
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
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