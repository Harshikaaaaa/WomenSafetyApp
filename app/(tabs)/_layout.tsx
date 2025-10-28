import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: true, title: 'Safe Route Finder' }} />
      <Stack.Screen name="route-analysis" options={{ headerShown: true, title: 'Route Safety Analysis' }} />
    </Stack>
  );
}