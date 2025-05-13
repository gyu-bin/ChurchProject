// app/_layout.tsx
import React, { useEffect } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { DesignSystemProvider } from '@/context/DesignSystem';
import RootLayoutInner from './_layout-inner';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { requestNotificationPermission } from '@/utils/notificationPermission';
import { cleanDuplicateExpoTokens } from '@/services/cleanExpoTokens';
import * as NavigationBar from 'expo-navigation-bar';
import { useColorScheme,Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    useEffect(() => {
        requestNotificationPermission();
        cleanDuplicateExpoTokens();

        // ✅ 앱이 실행 중일 때 알림 클릭 감지
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const screen = response.notification.request.content.data?.screen;
            if (screen) {
                router.push(`/${screen}` as any);
            }
        });

        // ✅ 앱이 종료되었을 때 알림 클릭 감지
        Notifications.getLastNotificationResponseAsync().then(response => {
            const screen = response?.notification?.request.content.data?.screen;
            if (screen) {
                router.push(`/${screen}` as any);
            }
        });

        return () => subscription.remove();
    }, [router]);

    useEffect(() => {
        NavigationBar.setBackgroundColorAsync(isDark ? '#1f2937' : '#ffffff');
        NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
    }, [isDark]);

    return (
        <ThemeProvider>
            <DesignSystemProvider>
                <SafeAreaProvider>
                    <RootLayoutInner />
                </SafeAreaProvider>
            </DesignSystemProvider>
        </ThemeProvider>
    );
}
