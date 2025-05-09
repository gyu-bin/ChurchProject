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
        if (!to || !message || !type) return;

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
    } catch (error) {
        console.error('❌ 알림 저장 실패:', error);
    }
}

export async function sendPushNotification({
                                               to,
                                               title,
                                               body,
                                           }: {
    to: string | string[];
    title: string;
    body: string;
}) {
    try {
        const tokens = Array.isArray(to) ? to : [to];
        console.log('📤 [sendPushNotification] 전송 시작 →', tokens);

        const messages = tokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
        }));

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const data = await response.json();
        console.log('📡 응답:', data);

        // DeviceNotRegistered 토큰 삭제
        if (Array.isArray(data?.data)) {
            for (let i = 0; i < data.data.length; i++) {
                const item = data.data[i];
                if (item.status === 'error' && item.details?.error === 'DeviceNotRegistered') {
                    const tokenToDelete = tokens[i];
                    console.warn('🗑️ 만료된 토큰 삭제:', tokenToDelete);

                    const q = query(collection(db, 'expoTokens'), where('token', '==', tokenToDelete));
                    const snap = await getDocs(q);
                    snap.forEach(async (docSnap) => {
                        await deleteDoc(doc(db, 'expoTokens', docSnap.id));
                        console.log('✅ 삭제됨:', docSnap.id);
                    });
                }
            }
        }

    } catch (err) {
        console.error('❌ sendPushNotification 에러:', err);
    }
}

