// ✅ services/notificationService.ts
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NotificationType = 'team_create' | 'team_join_request' | 'prayer_private';

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
    type: 'team_create' | 'team_join_request' | 'prayer_private';
    link?: string;
    teamId?: string;
    teamName?: string;
    applicantEmail?: string;
    applicantName?: string;
}) {
    try {
        console.log('📤 알림 전송 시도', { to, message, type, teamId, teamName, applicantEmail, applicantName });

        // 🔒 필수 필드 검증
        if (!to || !message || !type) {
            throw new Error('to, message, type은 필수입니다.');
        }

        if (type === 'team_join_request') {
            if (!teamId || !teamName || !applicantEmail || !applicantName) {
                throw new Error('team_join_request 알림에는 teamId, teamName, applicantEmail, applicantName이 필요합니다.');
            }
        }

        // ✅ 알림 저장
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

        console.log('✅ 알림 저장 완료');
    } catch (error) {
        console.error('❌ 알림 저장 실패:', error);
    }
}

export async function sendPushNotification({
                                               to,
                                               title,
                                               body
                                           }: {
    to: string;
    title: string;
    body: string;
}) {
    try {
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
        console.log('📡 푸시 응답:', data);
    } catch (err) {
        console.error('❌ 푸시 알림 실패:', err);
    }
}

export async function registerPushToken() {
    try {
        if (!Device.isDevice) return;

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

        await addDoc(collection(db, 'expoTokens'), {
            email: user.email,
            token,
            createdAt: serverTimestamp(),
        });
    } catch (err) {
        console.log('Expo push token error:', err);
    }
}
