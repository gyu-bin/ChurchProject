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
import {store} from "@/redux/store";
import { Provider } from 'react-redux';
import { RootSiblingParent } from 'react-native-root-siblings';
import {clearTeams} from "@/redux/slices/teamSlice";
import {clearPrayers} from "@/redux/slices/prayerSlice";
import {logoutUser,setUserInfo} from "@/redux/slices/userSlice";
import {doc, getDoc,onSnapshot} from "firebase/firestore";
import {db} from "@/firebase/config";
import * as Device from 'expo-device';
import {tryBiometricLogin} from "@/utils/biometricLogin";
import {registerPushToken} from "@/services/registerPushToken";
import {registerDevice} from "@/services/registerDevice";

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
        const checkAndLogin = async () => {
            const userRaw = await AsyncStorage.getItem('currentUser');
            const alreadyLoggedIn = Boolean(userRaw);
            if (!alreadyLoggedIn) {
                const user = await tryBiometricLogin();
                if (user) {
                    await registerPushToken();
                    await registerDevice();
                    store.dispatch(setUserInfo(user)); // 로그인 관련 Redux 반영
                    router.replace('/');
                } else {
                    router.replace('/auth/login'); // Face ID 실패 → 로그인 화면
                }
            }
        };

        checkAndLogin();
    }, []);


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

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const listenDeviceStatus = async () => {
            const userRaw = await AsyncStorage.getItem('currentUser');
            if (!userRaw) return;

            const { email } = JSON.parse(userRaw);
            const currentDeviceId = `${Device.modelName}-${Device.osName}-${Device.osVersion}`;
            const deviceDocRef = doc(db, `devices/${email}/tokens/${currentDeviceId}`);

            unsubscribe = onSnapshot(deviceDocRef, async (docSnap) => {
                if (!docSnap.exists()) {
                    // 실시간으로 문서 삭제 감지 → 로그아웃 처리
                    await AsyncStorage.removeItem('currentUser');
                    store.dispatch(logoutUser());
                    store.dispatch(clearPrayers());
                    store.dispatch(clearTeams());
                    router.replace('/auth/login');
                }
            });
        };

        listenDeviceStatus();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    return (
        <Provider store={store}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <RootSiblingParent>
                    <ThemeProvider>
                        <DesignSystemProvider>
                            <SafeAreaProvider>
                                <RootLayoutInner />
                            </SafeAreaProvider>
                        </DesignSystemProvider>
                    </ThemeProvider>
                </RootSiblingParent>
            </GestureHandlerRootView>
        </Provider>
    );
}
