import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/hooks/useAuth';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,  // ✅ 새로 추가
        shouldShowList: true     // ✅ 새로 추가
    }),
});

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const { user, loading } = useAuth();
    const pathname = usePathname();

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

    // ✅ 1. 앱 처음 시작 시 intro 보여주기
    if (!user && pathname !== '/intro' && pathname !== '/auth/login' && pathname !== '/auth/register') {
        return <Redirect href="/intro" />;
    }

    // ✅ 2. 로그인 유저가 /auth 경로 접근 못하도록
    if (user && pathname.startsWith('/auth')) {
        return <Redirect href="/" />;
    }
    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                <Stack.Screen name="auth/register" options={{ headerShown: false }} />
                <Stack.Screen name="intro" options={{ headerShown: false }} />  {/* ✅ 이 줄 */}
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}
