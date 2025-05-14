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

export async function registerPushToken() {
    try {
        console.log('🔧 [registerPushToken] 시작');

        // 1. 알림 권한 확인
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') return;
        }

        // 2. 토큰 획득
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('✅ Expo Push Token:', token);

        // 3. 현재 로그인 유저 가져오기
        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) return;
        const user = JSON.parse(raw);
        const email = user.email;

        const userRef = doc(db, 'users', email);

        // 4. Firestore에 토큰 저장 (배열에 중복 없이 추가)
        await updateDoc(userRef, {
            expoPushTokens: arrayUnion(token),
            updatedAt: serverTimestamp(),
        });

        // 5. expoTokens 컬렉션에 중복 없을 경우만 저장
        const q = query(collection(db, 'expoTokens'), where('token', '==', token));
        const snap = await getDocs(q);
        if (snap.empty) {
            await addDoc(collection(db, 'expoTokens'), {
                email,
                token,
                createdAt: serverTimestamp(),
            });
        }
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
