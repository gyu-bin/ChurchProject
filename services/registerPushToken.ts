import {
    addDoc,
    collection,
    serverTimestamp,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
            console.warn('❌ 알림 권한 거부됨');
            return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        console.log('✅ Expo Push Token:', token);

        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) {
            console.warn('❌ 사용자 정보 없음');
            return;
        }

        const user = JSON.parse(raw);
        console.log('📌 사용자 이메일:', user.email);

        // ✅ expoTokens: 같은 토큰이 없을 경우에만 저장
        const q = query(collection(db, 'expoTokens'), where('token', '==', token));
        const snap = await getDocs(q);

        if (snap.empty) {
            await addDoc(collection(db, 'expoTokens'), {
                email: user.email,
                token,
                createdAt: serverTimestamp(),
            });
            console.log('✅ expoTokens에 새 토큰 저장 완료');
        } else {
            console.log('ℹ️ 이미 등록된 토큰입니다');
        }

        // ✅ users 문서의 expoPushTokens 배열에 추가
        const userRef = doc(db, 'users', user.email);
        await updateDoc(userRef, {
            expoPushTokens: updateArrayField(token),
            updatedAt: serverTimestamp(),
        });

        console.log('✅ users 문서에 토큰 배열 업데이트 완료');
    } catch (err) {
        console.log('❌ Expo push token 등록 에러:', err);
    }
}

// 🔁 Firebase arrayUnion 대응 (비동기 배열 처리)
function updateArrayField(newToken: string) {
    return (prev: any[] = []) => {
        if (!prev.includes(newToken)) {
            return [...prev, newToken];
        }
        return prev;
    };
}
