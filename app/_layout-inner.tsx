import { useAppTheme } from '@/app/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';

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

  useEffect(() => {
    if (!loading && fontsLoaded) {
      // 로그인 안 됐고 intro나 auth 아님 → intro로 이동
      if (!user && pathname !== '/intro' && !pathname.startsWith('/auth')) {
        router.replace('/intro');
      }

      // 로그인 됐고 auth에 있으면 → 홈으로 이동
      if (user && pathname.startsWith('/auth')) {
        router.replace('/(tabs)/home');
      }
    }
  }, [user, loading, fontsLoaded, pathname]);

  // 로딩 중이면 로딩 화면
  if (!fontsLoaded || loading) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
    );
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
          <Stack.Screen name="home/notifications" options={{ headerShown: false }} />
          <Stack.Screen name="home/QuickMenuButton/AiChatPage" options={{ headerShown: false }} />
          <Stack.Screen name="setting/videoManager" options={{ headerShown: false }} />
          <Stack.Screen name="setting/joinTeams" options={{ headerShown: false }} />
          <Stack.Screen name="setting/noticeManager" options={{ headerShown: false }} />
          <Stack.Screen name="setting/feedback" options={{ headerShown: false }} />
          <Stack.Screen name="setting/ForgotPassword" options={{ headerShown: false }} />
          <Stack.Screen name="home/QuickMenuButton/catechism" options={{ headerShown: false }} />
          <Stack.Screen name="home/QuickMenuButton/todayVerse" options={{ headerShown: false }} />
          <Stack.Screen name="home/BannerDetail/event" options={{ headerShown: false }} />
          <Stack.Screen name="share/allPrayer" options={{ headerShown: false }} />
          <Stack.Screen name="share/prayerModal" options={{ headerShown: false }} />
          <Stack.Screen name="home/active" options={{ headerShown: false }} />
          <Stack.Screen name="share/DailyBible" options={{ headerShown: false }} />
          <Stack.Screen name="home/QuickMenuButton/counseling" options={{ headerShown: false }} />
          <Stack.Screen name="department/createDep" options={{ headerShown: false }} />
          <Stack.Screen name="home/notice/allNotice" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
  );
}
