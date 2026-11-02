import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SessionProvider, useSession } from '@/lib/session';
import { colors } from '@/components/ui';

function Navigation() {
  const { user, ready } = useSession();
  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} accessibilityLabel="로그인 상태 확인 중" />
      </View>
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user} redirectTo="/welcome">
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="theme/[id]" />
        <Stack.Screen name="review" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="settings" />
      </Stack.Protected>
      <Stack.Protected guard={!user} redirectTo="/">
        <Stack.Screen name="welcome" options={{ animation: 'none' }} />
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Navigation />
    </SessionProvider>
  );
}
