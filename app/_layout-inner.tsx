import { useAppTheme } from '@/context/ThemeContext';
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

function handleRedirect(user: any, pathname: any) {
  if (!user && !pathname.startsWith('/intro') && !pathname.startsWith('/auth')) {
    return <Redirect href='/intro' />;
  }

  if (user && pathname.startsWith('/auth')) {
    return <Redirect href='/(tabs)/home' />;
  }

  return null;
}

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
        <ActivityIndicator size='large' color='#2563eb' />
      </View>
    );
  }

  const redirectComponent = handleRedirect(user, pathname);
  if (redirectComponent) return redirectComponent;

  return (
    <ThemeProvider value={mode === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen name='auth/login' options={{ headerShown: false }} />
        <Stack.Screen name='auth/register' options={{ headerShown: false }} />
        <Stack.Screen name='auth/ForgotPassword' options={{ headerShown: false }} />
        <Stack.Screen name='intro' options={{ headerShown: false }} />
        <Stack.Screen name='teams' options={{ headerShown: false }} />
        <Stack.Screen name='home/notifications' options={{ headerShown: false }} />
        <Stack.Screen name='home/QuickMenuButton/AiChatPage' options={{ headerShown: false }} />
        <Stack.Screen name='myPage/videoManager' options={{ headerShown: false }} />
        <Stack.Screen name='myPage/joinTeams' options={{ headerShown: false }} />
        <Stack.Screen name='myPage/setting' options={{ headerShown: false }} />
        <Stack.Screen name='myPage/noticeManager' options={{ headerShown: false }} />
        <Stack.Screen name='myPage/feedback' options={{ headerShown: false }} />
        <Stack.Screen name='myPage/ForgotPassword' options={{ headerShown: false }} />
        <Stack.Screen name='home/QuickMenuButton/catechism' options={{ headerShown: false }} />
        <Stack.Screen name='home/QuickMenuButton/todayVerse' options={{ headerShown: false }} />
        <Stack.Screen name='home/BannerDetail/event' options={{ headerShown: false }} />
        <Stack.Screen name='share/allPrayer' options={{ headerShown: false }} />
        <Stack.Screen name='share/prayerModal' options={{ headerShown: false }} />
        <Stack.Screen name='home/active' options={{ headerShown: false }} />
        <Stack.Screen name='share/DailyBible' options={{ headerShown: false }} />
        <Stack.Screen name='home/QuickMenuButton/counseling' options={{ headerShown: false }} />
        <Stack.Screen name='home/notice/allNotice' options={{ headerShown: false }} />
        <Stack.Screen name='home/QuickMenuButton/churchNewsPage' options={{ headerShown: false }} />
        <Stack.Screen name='share/thank' options={{ headerShown: false }} />
        <Stack.Screen name='share/SermonTabs' options={{ headerShown: false }} />
        <Stack.Screen name='share/sermon/sermonQustionDeatil' options={{ headerShown: false }} />
        <Stack.Screen
          name='home/QuickMenuButton/BulletinListPage'
          options={{ headerShown: false }}
        />
        <Stack.Screen name='home/QuickMenuButton/calendar' options={{ headerShown: false }} />
        <Stack.Screen name='home/calendarDetail/alarmList' options={{ headerShown: false }} />
        <Stack.Screen
          name='department/create/CreateDepartmentPostPage'
          options={{ headerShown: false }}
        />
        <Stack.Screen name='department/detail/[id]' options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
