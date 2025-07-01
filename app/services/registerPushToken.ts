import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import { PermissionsAndroid, Platform } from 'react-native';

// Add device info type
type DeviceInfo = {
    token: string;
    email: string;
    platform: string;
    osVersion: string;
    deviceModel: string;
    deviceName: string;
    isDevice: boolean;
    lastUsed: number;
    createdAt: any;
    deviceId: string;
};

// ✅ 푸시 토큰 등록
export default async function registerPushToken() {
    try {
        // 시뮬레이터 체크
        if (!Device.isDevice) {
            console.log('📱 시뮬레이터에서는 푸시 알림을 사용할 수 없습니다.');
            return;
        }

        // ✅ Android 13 이상 알림 권한 요청
        const androidVersion = typeof Platform.Version === 'string'
            ? parseInt(Platform.Version, 10)
            : Platform.Version;

        if (Platform.OS === 'android' && androidVersion >= 33) {
            try {
                const result = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                    return;
                }
            } catch (e) {
                console.warn('알림 권한 요청 실패:', e);
            }
        }

        // ✅ 알림 권한 확인 및 요청
        let { status } = await Notifications.getPermissionsAsync();

        if (status !== 'granted') {
            const response = await Notifications.requestPermissionsAsync();
            status = response.status;

            if (status !== 'granted') {
                return;
            }
        }

        // ✅ 푸시 토큰 획득
        const token = (await Notifications.getExpoPushTokenAsync()).data;

        // ✅ 사용자 정보 가져오기
        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) return;

        const user = JSON.parse(raw);
        const email = user.email;

        // Generate unique device ID
        const deviceId = `${Device.modelName}-${Platform.OS}-${Platform.Version}-${Date.now()}`;

        // Create device info object
        const deviceInfo: DeviceInfo = {
            token,
            email,
            platform: Platform.OS,
            osVersion: Platform.Version.toString(),
            deviceModel: Device.modelName || 'Unknown',
            deviceName: Device.deviceName || Device.modelName || 'Unknown Device',
            isDevice: Device.isDevice,
            lastUsed: Date.now(),
            createdAt: serverTimestamp(),
            deviceId
        };

        // Check for existing token
        const tokenQuery = query(collection(db, 'expoTokens'), where('token', '==', token));
        const tokenSnap = await getDocs(tokenQuery);

        // If token exists, update it
        if (!tokenSnap.empty) {
            const docId = tokenSnap.docs[0].id;
            await updateDoc(doc(db, 'expoTokens', docId), {
                ...deviceInfo,
                lastUsed: Date.now()
            });
        } else {
            // Create new token document
            await setDoc(doc(db, 'expoTokens', deviceId), deviceInfo);
        }

        // Update user's tokens array
        const userRef = doc(db, 'users', email);
        await updateDoc(userRef, {
            expoPushTokens: arrayUnion(deviceId),
            updatedAt: serverTimestamp(),
        });

    } catch (err) {
        console.error('푸시 토큰 등록 실패:', err);
    }
}

// ✅ 푸시 토큰 제거
export async function removeDeviceToken() {
    try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) return;

        const user = JSON.parse(raw);
        const email = user.email;

        // Find and delete token document
        const tokenQuery = query(collection(db, 'expoTokens'), where('token', '==', token));
        const tokenSnap = await getDocs(tokenQuery);

        if (!tokenSnap.empty) {
            const deviceId = tokenSnap.docs[0].data().deviceId;

            // Remove from user's tokens array
            const userRef = doc(db, 'users', email);
            await updateDoc(userRef, {
                expoPushTokens: arrayRemove(deviceId)
            });

            // Delete token document
            await deleteDoc(doc(db, 'expoTokens', deviceId));
        }

    } catch (err) {
        console.error('❌ removeDeviceToken 에러:', err);
    }
}

// Add function to clean up old tokens
export async function cleanupOldTokens(email: string) {
    try {
        const tokenQuery = query(collection(db, 'expoTokens'), where('email', '==', email));
        const tokenSnap = await getDocs(tokenQuery);

        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

        const oldTokens = tokenSnap.docs.filter(doc => {
            const data = doc.data();
            return data.lastUsed < thirtyDaysAgo;
        });

        // Delete old tokens
        for (const tokenDoc of oldTokens) {
            const data = tokenDoc.data();
            const deviceId = data.deviceId;

            await deleteDoc(tokenDoc.ref);

            const userRef = doc(db, 'users', email);
            await updateDoc(userRef, {
                expoPushTokens: arrayRemove(deviceId)
            });
        }

    } catch (err) {
        console.error('❌ cleanupOldTokens 에러:', err);
    }
}
