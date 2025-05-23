//services/notificationService.ts
import { db } from "@/firebase/config";
import {
    addDoc,
    collection, deleteDoc, doc,
    getDocs,
    query,
    serverTimestamp,
    where
} from 'firebase/firestore';


type NotificationType =
    | 'team_create'
    | 'team_join_request'
    | 'team_join_approved'     // ✅ 신규
    | 'team_create_approved'   // ✅ 신규
    | 'prayer_private'
    | 'open_meditation_ranking'// ✅ 여기 추가
    | 'schedule_update'; // ✅ 여기 추가

export async function sendNotification({
                                           to,
                                           message,
                                           type,
                                           link,
                                           tab, // ✅ 추가
                                           teamId,
                                           teamName,
                                           applicantEmail,
                                           applicantName,
                                           scheduleDate
                                       }: {
    to: string;
    message: string;
    type: NotificationType;
    link?: string;
    tab?: string; // ✅ 타입 정의에 추가
    teamId?: string;
    teamName?: string;
    applicantEmail?: string;
    applicantName?: string;
    scheduleDate?: string, // ✅ 추가
}) {
    try {
        if (!to || !message || !type) return;

        await addDoc(collection(db, 'notifications'), {
            to,
            message,
            type,
            link: link ?? null,
            tab: tab ?? null, // ✅ Firestore에 함께 저장
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
                                               data, // ✅ 유동적 데이터 전달
                                           }: {
    to: string | string[];
    title: string;
    body: string;
    data?: Record<string, any>; // ✅ 선택적, 자유 구조
}) {
    try {
        const tokens = Array.isArray(to) ? to : [to];
        console.log('📤 [sendPushNotification] 전송 시작 →', tokens);

        const messages = tokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data: data || {}, // ✅ 기본값 빈 객체
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

        const responseData = await response.json();
        console.log('📡 응답:', responseData);

        // ✅ 만료된 토큰 삭제
        if (Array.isArray(responseData?.data)) {
            for (let i = 0; i < responseData.data.length; i++) {
                const item = responseData.data[i];
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
export const sendPushNotificationToTeam = async (
    teamId: string,
    senderEmail: string,
    payload: {
        title: string;
        body: string;
        data?: any;
    }
) => {
    const snapshot = await getDocs(collection(db, 'teams', teamId, 'members'));

    const tokens: string[] = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.email !== senderEmail && data.pushToken) {
            tokens.push(data.pushToken);
        }
    });

    if (tokens.length === 0) {
        console.log('🔕 보낼 토큰 없음');
        return;
    }

    await sendPushNotification({
        to: tokens,
        title: payload.title,
        body: payload.body,
        data: payload.data,
    });
};

export const logReceivableTeamMembers = async (teamId: string, senderEmail: string) => {
    const snapshot = await getDocs(collection(db, 'teams', teamId, 'members'));

    const recipients: { email: string; tokens: string[] }[] = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.email !== senderEmail && Array.isArray(data.expoPushTokens)) {
            recipients.push({
                email: data.email,
                tokens: data.expoPushTokens,
            });
        }
    });

    console.log('📤 전송 대상 목록:', recipients);
};
