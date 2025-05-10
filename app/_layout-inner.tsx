// app/_layout-inner.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/hooks/useAuth';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAppTheme } from '@/context/ThemeContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayoutInner() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const { mode } = useAppTheme();

  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!fontsLoaded || loading) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
    );
  }

  if (!user && pathname !== '/intro' && !pathname.startsWith('/auth')) {
    return <Redirect href="/intro" />;
  }

  if (user && pathname.startsWith('/auth')) {
    return <Redirect href="/" />;
  }

  return (
      <ThemeProvider value={mode === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
          <Stack.Screen name="intro" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
  );
}
