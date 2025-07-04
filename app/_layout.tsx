// app/_layout.tsx
// import PromoModal from "@/app/PromoModal";
import { DesignSystemProvider } from '@/context/DesignSystem';
import { ThemeProvider } from '@/context/ThemeContext';
import { db } from "@/firebase/config";
import { clearPrayers } from "@/redux/slices/prayerSlice";
import { clearTeams } from "@/redux/slices/teamSlice";
import { logoutUser } from "@/redux/slices/userSlice";
import { store } from "@/redux/store";
import { savePushTokenToFirestore } from "@/services/pushTokenService";
import { sendWeeklyRankingPush } from "@/services/sendWeeklyRankingPush";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from 'expo-device';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootSiblingParent } from 'react-native-root-siblings';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import RootLayoutInner from './_layout-inner';
import { logErrorToDatabase } from './utils/logErrorToDatabase';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'light';
    const router = useRouter();
    const [isAppReady, setIsAppReady] = useState(false);

    const initializeApp = async () => {
        try {
            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    const permission = await Notifications.requestPermissionsAsync();
                    finalStatus = permission.status;
                    // console.log('알림 최종 상태:', finalStatus);
                }

                if (finalStatus === 'granted') {
                    // console.log('✅ 알림 권한 허용됨');

                    const tokenData = await Notifications.getExpoPushTokenAsync();
                    const expoPushToken = tokenData.data;
                    // console.log('📦 Expo Push Token:', expoPushToken);

                    await savePushTokenToFirestore(expoPushToken);
                } else {
                    // console.warn('❗️알림 권한이 거부되었습니다.');
                }
            }

            setTimeout(() => {
                setIsAppReady(true);
            }, 300);
        } catch (e) {
            if (e instanceof Error) {
                await logErrorToDatabase(e, 'initializeApp 중 오류');
            }
            console.error('앱 초기화 중 오류:', e);
            setIsAppReady(true);
        }
    };

    // ✅ 기존 최초 1회 실행
    useEffect(() => {
        initializeApp();
    }, []);

    // ✅ 앱이 포그라운드에 올 때마다 다시 실행
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                initializeApp();
            }
        });

        return () => subscription.remove();
    }, []);



    useEffect(() => {
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
            try {
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
                }
            } catch (e) {
                if (e instanceof Error) {
                    await logErrorToDatabase(e, 'checkAndSendPush 중 오류');
                }
            }
        };

        checkAndSendPush();
    }, []);

    //계정이 삭제되었을때
    useEffect(() => {
        let unsubRef: (() => void) | null = null;

        const run = async () => {
            try{const userRaw = await AsyncStorage.getItem('currentUser');
                if (!userRaw) return;

                const { email } = JSON.parse(userRaw);
                const currentDeviceId = `${Device.modelName}-${Device.osName}-${Device.osVersion}`;
                const deviceDocRef = doc(db, `devices/${email}/tokens/${currentDeviceId}`);

                const unsubscribe = onSnapshot(deviceDocRef, async (docSnap) => {
                    if (!docSnap.exists()) {
                        await AsyncStorage.removeItem('currentUser');
                        store.dispatch(logoutUser());
                        store.dispatch(clearPrayers());
                        store.dispatch(clearTeams());
                        router.replace('/auth/login');
                    }
                });

                unsubRef = unsubscribe;
            }catch(e){
                if (e instanceof Error) {
                    await logErrorToDatabase(e, '계정 삭제 감지 run 중 오류');
                }
            }
        };

        run();

        return () => {
            if (unsubRef) {
                unsubRef();
            }
        };
    }, []);

    return isAppReady ? (
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
    ) : null;
}
