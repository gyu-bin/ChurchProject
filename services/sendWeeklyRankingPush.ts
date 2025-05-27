import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { sendPushNotification, sendNotification } from './notificationService';

export async function sendWeeklyRankingPush() {
    const snap = await getDocs(collection(db, 'expoTokens'));
    const tokenList = snap.docs.map(doc => doc.data().token).filter(Boolean);
    const userList = snap.docs.map(doc => doc.data().email).filter(Boolean);

    if (tokenList.length === 0 || userList.length === 0) return;

    // ✅ Firestore 알림 저장 (for 알림 탭)
    await Promise.all(userList.map(email =>
        sendNotification({
            to: email,
            message: '📊 일주일 묵상 랭킹이 업데이트되었습니다!',
            type: 'open_meditation_ranking',
            link: '/prayerPage/DailyBible?showRanking=true',  // ✅ 정확한 경로로
        })
    ));

    // ✅ 푸시 알림 전송
    await sendPushNotification({
        to: tokenList,
        title: '📊 묵상 랭킹이 업데이트되었습니다!',
        body: '일주일 간 랭킹을 지금 확인해보세요.',
        data: {
            link: '/prayerPage/DailyBible?showRanking=true',  // ✅ 정확한 경로로
            type: 'open_meditation_ranking',
        },
    });
    console.log(tokenList);
}
