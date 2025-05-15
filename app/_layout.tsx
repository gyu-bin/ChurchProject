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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {sendWeeklyRankingPush} from "@/services/sendWeeklyRankingPush";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

    useEffect(() => {
        const now = new Date();
        const day = now.getDay(); // 일요일: 0
        const hour = now.getHours(); // 0~23
        const minute = now.getMinutes(); // 0~59
        const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        const storageKey = 'weeklyPushSent';

        const checkAndSendPush = async () => {
            const lastSent = await AsyncStorage.getItem(storageKey);

            if (
                day === 0 &&
                hour === 22 &&
                minute === 0 &&
                lastSent !== todayKey
            ) {
                await sendWeeklyRankingPush();
                await AsyncStorage.setItem(storageKey, todayKey);
                console.log('✅ 푸시 전송 완료');
            } else {
                console.log('ℹ️ 푸시 전송 조건 미충족 or 이미 전송됨');
            }
        };

        checkAndSendPush();
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
            <DesignSystemProvider>
                <SafeAreaProvider>
                    <RootLayoutInner />
                </SafeAreaProvider>
            </DesignSystemProvider>
        </ThemeProvider>
        </GestureHandlerRootView>
    );
}
