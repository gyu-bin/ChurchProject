import { addDoc, collection, serverTimestamp, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function registerPushToken() {
    try {
        console.log('🔧 [registerPushToken] 시작');

        if (!Device.isDevice) {
            console.warn('❌ 실제 디바이스에서만 작동합니다.');
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') return;

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        console.log('✅ Expo Push Token:', token);

        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) return;

        const user = JSON.parse(raw);
        console.log('📌 사용자 이메일:', user.email);

        // ✅ expoTokens 컬렉션에 등록/업데이트
        const q = query(collection(db, 'expoTokens'), where('email', '==', user.email));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const tokenDocRef = doc(db, 'expoTokens', snap.docs[0].id);
            await updateDoc(tokenDocRef, {
                token,
                updatedAt: serverTimestamp(),
            });
        } else {
            await addDoc(collection(db, 'expoTokens'), {
                email: user.email,
                token,
                createdAt: serverTimestamp(),
            });
        }

        // ✅ users 문서에도 expoPushToken 저장
        const userRef = doc(db, 'users', user.email);
        await updateDoc(userRef, {
            expoPushToken: token,
            updatedAt: serverTimestamp(),
        });

        console.log('✅ 토큰 Firebase에 저장 완료 (users, expoTokens)');
    } catch (err) {
        console.log('Expo push token error:', err);
    }
}
