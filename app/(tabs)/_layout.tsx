import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar hidden />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="route-analysis" options={{ headerShown: true, title: 'Route Safety Analysis' }} />
      </Stack>
    </>
  );
}