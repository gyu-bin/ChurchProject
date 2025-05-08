import {
    addDoc,
    collection,
    serverTimestamp,
    getDocs,
    query,
    where,
    doc,
    updateDoc,deleteDoc
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NotificationType =
    | 'team_create'
    | 'team_join_request'
    | 'team_join_approved'     // ✅ 신규
    | 'team_create_approved'   // ✅ 신규
    | 'prayer_private';

export async function sendNotification({
                                           to,
                                           message,
                                           type,
                                           link,
                                           teamId,
                                           teamName,
                                           applicantEmail,
                                           applicantName,
                                       }: {
    to: string;
    message: string;
    type: NotificationType;
    link?: string;
    teamId?: string;
    teamName?: string;
    applicantEmail?: string;
    applicantName?: string;
}) {
    try {
        console.log('📤 알림 전송 시도', {
            to,
            message,
            type,
            teamId,
            teamName,
            applicantEmail,
            applicantName,
        });

        // 유효성 검사
        if (!to || !message || !type) {
            throw new Error('to, message, type은 필수입니다.');
        }

        if (type === 'team_join_request') {
            if (!teamId || !teamName || !applicantEmail || !applicantName) {
                throw new Error('team_join_request 알림에는 teamId, teamName, applicantEmail, applicantName이 필요합니다.');
            }
        }

        // Firestore에 알림 저장
        await addDoc(collection(db, 'notifications'), {
            to,
            message,
            type,
            link: link ?? null,
            teamId: teamId ?? null,
            teamName: teamName ?? null,
            applicantEmail: applicantEmail ?? null,
            applicantName: applicantName ?? null,
            createdAt: serverTimestamp(),
        });

        // 해당 사용자 이메일로 등록된 모든 푸시 토큰 조회
        const q = query(collection(db, 'expoTokens'), where('email', '==', to));
        const snap = await getDocs(q);

        if (!snap.empty) {
            for (const docSnap of snap.docs) {
                const token = docSnap.data().token;
                await sendPushNotification({
                    to: token,
                    title: '📢 새로운 알림',
                    body: message,
                });
            }
        } else {
            console.log(`❗️푸시 토큰 없음: ${to}`);
        }
    } catch (error) {
        console.error('❌ 알림 저장 실패:', error);
    }
}

export async function sendPushNotification({
                                               to,
                                               title,
                                               body,
                                           }: {
    to: string;
    title: string;
    body: string;
}) {
    try {
        console.log('📤 [sendPushNotification] 전송 시작 →', to);
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to,
                sound: 'default',
                title,
                body,
            }),
        });

        const data = await response.json();
        console.log('📡 응답:', data);

        // ❌ 만료된 토큰 자동 정리
        if (data?.data?.status === 'error') {
            const errorCode = data?.data?.details?.error;
            if (errorCode === 'DeviceNotRegistered') {
                console.warn('🗑️ 만료된 토큰, Firestore에서 제거:', to);

                const q = query(collection(db, 'expoTokens'), where('token', '==', to));
                const snap = await getDocs(q);
                snap.forEach(async (docSnap) => {
                    await deleteDoc(doc(db, 'expoTokens', docSnap.id));
                    console.log('✅ 삭제됨:', docSnap.id);
                });
            }
        }

    } catch (err) {
        console.error('❌ sendPushNotification 에러:', err);
    }
}

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

        if (finalStatus !== 'granted') return;

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        console.log('✅ Expo Push Token:', token);

        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) return;

        const user = JSON.parse(raw);
        console.log('📌 사용자 이메일:', user.email);

        // 🔁 이미 등록된 경우 업데이트
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

        console.log('✅ 토큰 Firebase에 저장 완료');
    } catch (err) {
        console.log('Expo push token error:', err);
    }
}
