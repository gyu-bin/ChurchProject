import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import fetch from 'node-fetch';

export const sendWeeklyDevotionRanking = functions.pubsub
    .schedule('0 22 * * 0') // 매주 일요일 22:00 KST
    .timeZone('Asia/Seoul')
    .onRun(async (context) => {
    try {
        const now = new Date();

        // 지난 주 월요일
        const monday = new Date(now);
        monday.setDate(now.getDate() - 7 - (now.getDay() === 0 ? 6 : now.getDay() - 1)); // 일요일이면 -6, 월요일이면 -7
        monday.setHours(0, 0, 0, 0);

        // 지난 주 토요일
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 6);
        saturday.setHours(23, 59, 59, 999);

        // 🔍 devotions 수집
        const snapshot = await admin.firestore()
            .collection('devotions')
            .where('createdAt', '>=', monday)
            .where('createdAt', '<=', saturday)
            .get();

        // 🔢 집계
        const countMap: Record<string, { count: number; name: string }> = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const email = data.authorEmail;
            if (!email) return;
            if (!countMap[email]) {
                countMap[email] = { count: 0, name: data.authorName || email };
            }
            countMap[email].count++;
        });

        const topUsers = Object.entries(countMap)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([email, data], index) => ({
                rank: index + 1,
                name: data.name,
                count: data.count,
            }));

        if (topUsers.length === 0) {
            console.log('❌ 집계된 묵상 데이터 없음');
            return;
        }

        // 📣 푸시 메시지 내용
        const title = '📊 이번주 묵상 랭킹이 업데이트되었습니다!';
        const body = `일주일간 랭킹을 지금 확인해보세요`;

        // 🔑 토큰 수집
        const tokenSnap = await admin.firestore().collection('expoTokens').get();
        const tokens = tokenSnap.docs.map(doc => doc.data()?.token).filter(Boolean);

        if (tokens.length === 0) {
            console.log('❌ 등록된 Expo 토큰 없음');
            return;
        }

        // ✅ 메시지 생성
        const messages = tokens.map(token => ({
            to: token,
            title,
            body,
            sound: 'default',
            priority: 'high',
            data: {
                type: 'ranking',
                screen: '/prayerPage/DailyBible?showRanking=true'
            }
        }));

        // ✅ 메시지 100개 단위로 나눠서 전송
        const chunkSize = 100;
        for (let i = 0; i < messages.length; i += chunkSize) {
            const chunk = messages.slice(i, i + chunkSize);
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chunk),
            });

            if (!response.ok) {
                throw new Error(`Expo 푸시 전송 실패 (HTTP ${response.status})`);
            }

            const result = await response.json();
            console.log(`✅ ${i + 1} ~ ${i + chunk.length}번째 알림 전송 완료`, result);
        }
    } catch (error) {
        console.error('❌ 주간 랭킹 푸시 실패:', error);
    }
});
