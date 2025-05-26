import { db } from '@/firebase/config';
import { collection, deleteDoc, doc, getDocs, query, updateDoc } from 'firebase/firestore';

export async function cleanDuplicateExpoTokens() {
    try {
        const q = query(collection(db, 'expoTokens'));
        const snap = await getDocs(q);

        const tokenMap = new Map<string, { id: string; token: string; deviceId: string }[]>();
        const userTokens = new Map<string, Set<string>>();

        // 토큰 정보 수집
        snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const { email, token, deviceId } = data;
            if (!email || !token || !deviceId) return;

            if (!tokenMap.has(email)) {
                tokenMap.set(email, []);
                userTokens.set(email, new Set());
            }
            tokenMap.get(email)!.push({ id: docSnap.id, token, deviceId });
            userTokens.get(email)!.add(deviceId);
        });

        // 각 사용자별로 토큰 정리
        for (const [email, entries] of tokenMap.entries()) {
            const seen = new Set<string>();
            const validDeviceIds = new Set<string>();

            // 중복 토큰 제거 및 유효한 deviceId 수집
            for (const entry of entries) {
                if (seen.has(entry.token)) {
                    await deleteDoc(doc(db, 'expoTokens', entry.id));
                    console.log(`🗑️ 중복 푸시토큰 삭제됨: ${entry.token} (email: ${email})`);
                } else {
                    seen.add(entry.token);
                    validDeviceIds.add(entry.deviceId);
                }
            }

            // 사용자 문서의 expoPushTokens 배열 업데이트
            const userRef = doc(db, 'users', email);
            await updateDoc(userRef, {
                expoPushTokens: Array.from(validDeviceIds)
            });
        }

        console.log('✅ 토큰 정리 완료');
    } catch (err) {
        console.error('❌ 토큰 정리 실패:', err);
    }
} 