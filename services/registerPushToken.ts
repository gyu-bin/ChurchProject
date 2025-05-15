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

// ✅ 디버그 로그를 Firestore에 저장
async function logToFirestore(message: string, extra: any = {}) {
    try {
        await addDoc(collection(db, 'debugLogs'), {
            message,
            ...extra,
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        // 로그 저장 실패는 무시
    }
}

export async function registerPushToken() {
    try {
        console.log('🔧 [registerPushToken] 시작');
        console.log('📱 Device.isDevice:', Device.isDevice);
        console.log('📦 Platform:', Platform.OS, Platform.Version);

        // ✅ Android 13+ 알림 권한 요청
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            const permission = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            console.log('🔐 POST_NOTIFICATIONS 권한 요청 결과:', permission);
        }

        // ✅ 알림 권한 확인 및 요청
        const { status } = await Notifications.getPermissionsAsync();
        console.log('🔍 알림 권한 상태:', status);

        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            console.log('🔄 재요청 결과:', newStatus);
            if (newStatus !== 'granted') {
                console.log('❌ 최종 알림 권한 거부됨');
                return;
            }
        }

        // ✅ 푸시 토큰 획득
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('✅ Expo Push Token:', token);

        if (!token || typeof token !== 'string' || token.length < 10) {
            console.log('❌ 유효하지 않은 토큰입니다.');
            return;
        }

        // ✅ 현재 로그인 유저 정보 가져오기
        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) return;
        const user = JSON.parse(raw);
        const email = user.email;
        const userRef = doc(db, 'users', email);

        // ✅ 사용자 문서에 저장
        await updateDoc(userRef, {
            expoPushTokens: arrayUnion(token),
            updatedAt: serverTimestamp(),
        });

        await logToFirestore('✅ users 문서에 토큰 저장', { email });

        // ✅ expoTokens 컬렉션에 중복 없이 저장
        const q = query(collection(db, 'expoTokens'), where('token', '==', token));
        const snap = await getDocs(q);
        if (snap.empty) {
            await addDoc(collection(db, 'expoTokens'), {
                email,
                token,
                createdAt: serverTimestamp(),
            });
            await logToFirestore('📦 expoTokens 컬렉션에 저장 완료', { email });
        } else {
            await logToFirestore('📦 expoTokens 컬렉션에 이미 존재', { email });
        }

        await logToFirestore('🎉 전체 registerPushToken 완료', { email });

        console.log('🎉 토큰 저장 완료!');
    } catch (err) {
        console.error('❌ registerPushToken 에러:', err);
    }
}

export async function removeDeviceToken() {
    try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) return;
        const user = JSON.parse(raw);
        const userRef = doc(db, 'users', user.email);

        // 1. Firestore에서 해당 토큰만 배열에서 제거
        await updateDoc(userRef, {
            expoPushTokens: arrayRemove(token),
        });

        // 2. expoTokens 컬렉션에서 해당 문서 삭제
        const q = query(collection(db, 'expoTokens'), where('token', '==', token));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, 'expoTokens', docSnap.id));
        }

        console.log('✅ 푸시 토큰 제거 완료');
    } catch (err) {
        console.error('❌ removeDeviceToken 에러:', err);
    }
}

