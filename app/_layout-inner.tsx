// app/_layout-inner.tsx
import { useAppTheme } from '@/app/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Redirect, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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

  //로그인 안될시 intro화면으로
  if (!user && pathname !== '/intro' && !pathname.startsWith('/auth')) {
    return <Redirect href="/intro" />;
  }

  //로그인이 되었아면 /홈으로
  if (user && pathname.startsWith('/auth')) {
    return <Redirect href="/" />;
  }

  return (
      <ThemeProvider value={mode === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
          <Stack.Screen name="auth/ForgotPassword" options={{ headerShown: false }} />
          <Stack.Screen name="intro" options={{ headerShown: false }} />
          <Stack.Screen name="teams" options={{ headerShown: false }} />
          <Stack.Screen name="department/[campus]/[division]/index" options={{ headerShown: false }} />
          <Stack.Screen name="home/notifications" options={{ headerShown: false }} />
          <Stack.Screen name="home/DailyBible" options={{ headerShown: false }} />
          <Stack.Screen name="home/AiChatPage" options={{ headerShown: false }} />
          <Stack.Screen name="setting/videoManager" options={{ headerShown: false }} />
          <Stack.Screen name="setting/joinTeams" options={{ headerShown: false }} />
          <Stack.Screen name="setting/noticeManager" options={{ headerShown: false }} />
          <Stack.Screen name="setting/feedback" options={{ headerShown: false }} />
          <Stack.Screen name="setting/ForgotPassword" options={{ headerShown: false }} />
          <Stack.Screen name="home/catechism" options={{ headerShown: false }} />
          <Stack.Screen name="home/todayVerse" options={{ headerShown: false }} />
          <Stack.Screen name="home/BannerDetail/event" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
  );
}
