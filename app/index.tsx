import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Only redirect on web and after mount so we don't navigate before the router is ready
    if (Platform.OS === 'web') {
      const t = setTimeout(() => {
        router.replace('/login');
      }, 50);
      return () => clearTimeout(t);
    }
  }, [router]);

  // Minimal loading UI while redirecting
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
