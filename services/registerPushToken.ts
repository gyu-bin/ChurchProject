import {
    addDoc,
    collection,
    serverTimestamp,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    deleteDoc,
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';

// 로그를 Firestore에 저장
async function logToFirestore(message: string, extra: any = {}) {
    try {
        await addDoc(collection(db, 'debugLogs'), {
            message,
            ...extra,
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        // 로그 저장 실패 무시
    }
}

// ✅ 푸시 토큰 등록
export async function registerPushToken() {
    try {
        await logToFirestore('🔧 [registerPushToken] 시작', {
            platform: Platform.OS,
            version: Platform.Version,
            device: Device.modelName,
            isDevice: Device.isDevice,
        });

        // ✅ Android 13 이상 알림 권한 요청
        const androidVersion = typeof Platform.Version === 'string'
            ? parseInt(Platform.Version, 10)
            : Platform.Version;

        if (Platform.OS === 'android' && androidVersion >= 33) {
            try {
                const permission = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                await logToFirestore('🔐 Android POST_NOTIFICATIONS 권한 요청', { result: permission });
            } catch (e) {
                await logToFirestore('⚠️ POST_NOTIFICATIONS 권한 요청 중 예외 발생', { error: String(e) });
            }
        }

        // ✅ 알림 권한 확인 및 요청
        let { status } = await Notifications.getPermissionsAsync();
        await logToFirestore('🔍 알림 권한 상태 확인', { status });

        if (status !== 'granted') {
            const response = await Notifications.requestPermissionsAsync();
            status = response.status;
            await logToFirestore('🔄 알림 권한 재요청 결과', { status });

            if (status !== 'granted') {
                await logToFirestore('❌ 최종 알림 권한 거부됨');
                return;
            }
        }

        // ✅ 푸시 토큰 획득
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await logToFirestore('✅ Expo Push Token 획득', { token });

        if (!token || typeof token !== 'string' || token.length < 10) {
            await logToFirestore('❌ 유효하지 않은 토큰', { token });
            return;
        }

        // ✅ 사용자 정보 가져오기
        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) {
            await logToFirestore('❌ currentUser 없음');
            return;
        }

        const user = JSON.parse(raw);
        const email = user.email;
        const userRef = doc(db, 'users', email);

        // ✅ Firestore 사용자 문서에 저장
        await updateDoc(userRef, {
            expoPushTokens: arrayUnion(token),
            updatedAt: serverTimestamp(),
        });
        await logToFirestore('✅ users 문서에 토큰 저장', { email });

        // ✅ expoTokens 컬렉션에 중복 확인 후 저장
        const q = query(collection(db, 'expoTokens'), where('token', '==', token));
        const snap = await getDocs(q);
        if (snap.empty) {
            await addDoc(collection(db, 'expoTokens'), {
                email,
                token,
                platform: Platform.OS,
                osVersion: Platform.Version,
                deviceModel: Device.modelName ?? 'unknown',
                isDevice: Device.isDevice,
                createdAt: serverTimestamp(),
            });
            await logToFirestore('📦 expoTokens 컬렉션에 저장 완료', { email });
        } else {
            await logToFirestore('📦 expoTokens 컬렉션에 이미 존재', { email });
        }

        await logToFirestore('🎉 전체 registerPushToken 완료', { email });
    } catch (err) {
        await logToFirestore('❌ registerPushToken 에러', { error: String(err) });
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
        const userRef = doc(db, 'users', email);

        // 사용자 문서에서 토큰 제거
        await updateDoc(userRef, {
            expoPushTokens: arrayRemove(token),
        });
        await logToFirestore('🗑️ users 문서에서 토큰 제거', { token, email });

        // expoTokens 컬렉션에서 삭제
        const q = query(collection(db, 'expoTokens'), where('token', '==', token));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, 'expoTokens', docSnap.id));
        }
        await logToFirestore('🗑️ expoTokens 컬렉션에서 토큰 제거 완료', { token });

    } catch (err) {
        await logToFirestore('❌ removeDeviceToken 에러', { error: String(err) });
    }
}
