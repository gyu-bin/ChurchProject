"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWeeklyDevotionRanking = void 0;
const date_fns_1 = require("date-fns");
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const node_fetch_1 = __importDefault(require("node-fetch"));
exports.sendWeeklyDevotionRanking = functions.pubsub
    .schedule('0 22 * * 0') // 매주 일요일 22:00 KST
    .timeZone('Asia/Seoul')
    .onRun(async (_context) => {
    try {
        const now = new Date();
        // ✅ 지난 주 월요일 계산
        const monday = new Date(now);
        monday.setDate(monday.getDate() - 7 - monday.getDay() + 1);
        monday.setHours(0, 0, 0, 0);
        // ✅ 지난 주 토요일 계산
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);
        saturday.setHours(23, 59, 59, 999);
        // ✅ 지난 주 데이터 조회
        const devotionsRef = admin.firestore().collection('devotions');
        const snapshot = await devotionsRef
            .where('createdAt', '>=', monday)
            .where('createdAt', '<=', saturday)
            .get();
        // ✅ 사용자별 묵상 횟수 집계
        const countMap = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const email = data.authorEmail;
            if (!countMap[email]) {
                countMap[email] = { count: 0, name: data.authorName };
            }
            countMap[email].count++;
        });
        // ✅ 상위 5명 추출
        const topUsers = Object.entries(countMap)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([email, data], index) => ({
            rank: index + 1,
            name: data.name,
            count: data.count
        }));
        if (topUsers.length === 0) {
            console.log('❌ 랭킹 데이터가 없습니다.');
            return null;
        }
        // ✅ 알림 메시지 생성
        const dateRange = `${(0, date_fns_1.format)(monday, 'MM/dd')}~${(0, date_fns_1.format)(saturday, 'MM/dd')}`;
        const title = `📊 ${dateRange} 주간 묵상 랭킹`;
        let message = '🏆 이번 주 묵상왕\n\n';
        topUsers.forEach(user => {
            const medal = user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : '✨';
            message += `${medal} ${user.rank}위: ${user.name} (${user.count}회)\n`;
        });
        // ✅ 모든 사용자의 expo 토큰 가져오기
        const tokens = [];
        const usersSnapshot = await admin.firestore().collection('expoTokens').get();
        usersSnapshot.docs.forEach(doc => {
            const token = doc.data().token;
            if (token)
                tokens.push(token);
        });
        if (tokens.length === 0) {
            console.log('❌ 푸시 토큰이 없습니다.');
            return null;
        }
        // ✅ 푸시 알림 전송
        const messages = tokens.map(token => ({
            to: token,
            title,
            body: message,
            data: {
                type: 'ranking',
                screen: '/prayerPage/DailyBible?showRanking=true'
            }
        }));
        const chunks = [];
        const chunkSize = 100;
        for (let i = 0; i < messages.length; i += chunkSize) {
            chunks.push(messages.slice(i, i + chunkSize));
        }
        // ✅ Expo 푸시 알림 서버로 전송
        for (const chunk of chunks) {
            try {
                const response = await (0, node_fetch_1.default)('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Accept-encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(chunk)
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                console.log('✅ 푸시 알림 전송 성공:', result);
            }
            catch (error) {
                console.error('❌ 푸시 알림 전송 실패:', error);
            }
        }
        return null;
    }
    catch (error) {
        console.error('❌ 주간 랭킹 처리 중 오류:', error);
        return null;
    }
});
//# sourceMappingURL=scheduledFunctions.js.map