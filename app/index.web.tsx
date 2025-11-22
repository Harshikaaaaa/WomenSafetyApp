import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function IndexRedirectWeb() {
  const router = useRouter();

  useEffect(() => {
    // Client-side only redirect for web to avoid navigation-before-mount
    const t = setTimeout(() => {
      router.replace('/login');
    }, 50);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
