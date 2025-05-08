import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

export async function registerPushToken() {
    try {
        console.log('🔧 [registerPushToken] 시작');

        if (!Device.isDevice) {
            console.warn('❌ 실제 디바이스에서만 작동합니다.');
            return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('❌ 알림 권한이 거부되었습니다.');
            return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        console.log('✅ Expo Push Token:', token);

        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) {
            console.warn('❌ currentUser 없음');
            return;
        }

        const user = JSON.parse(raw);
        console.log('📌 사용자 이메일:', user.email);

        await addDoc(collection(db, 'expoTokens'), {
            email: user.email,
            token,
            createdAt: serverTimestamp(),
        });

        console.log('✅ 토큰 Firebase에 저장 완료');
    } catch (err) {
        console.error('❌ registerPushToken 에러:', err);
    }
}
