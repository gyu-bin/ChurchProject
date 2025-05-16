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


// ✅ 푸시 토큰 등록
export async function registerPushToken() {
    try {
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
                    // return; // 사용자가 알림 거부
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
        if (!raw) {
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
        } else {
        }
    } catch (err) {
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

        // expoTokens 컬렉션에서 삭제
        const q = query(collection(db, 'expoTokens'), where('token', '==', token));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, 'expoTokens', docSnap.id));
        }

        // debugLogs 컬렉션에서 해당 이메일 관련 로그 삭제 (선택적)
        const logQuery = query(collection(db, 'debugLogs'), where('email', '==', email));
        const logSnap = await getDocs(logQuery);
        for (const docSnap of logSnap.docs) {
            await deleteDoc(doc(db, 'debugLogs', docSnap.id));
        }

    } catch (err) {
        console.error('❌ removeDeviceToken 에러:', err);
    }
}
