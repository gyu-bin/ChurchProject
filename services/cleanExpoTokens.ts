// services/cleanExpoTokens.ts
import { db } from '@/firebase/config';
import { collection, deleteDoc, doc, getDocs, query } from 'firebase/firestore';

export async function cleanDuplicateExpoTokens() {
    try {
        const q = query(collection(db, 'expoTokens'));
        const snap = await getDocs(q);

        const tokenMap = new Map<string, { id: string; token: string }[]>();

        snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const email = data.email;
            const token = data.token;
            if (!email || !token) return;

            if (!tokenMap.has(email)) tokenMap.set(email, []);
            tokenMap.get(email)!.push({ id: docSnap.id, token });
        });

        for (const [email, entries] of tokenMap.entries()) {
            const seen = new Set<string>();
            for (const entry of entries) {
                if (seen.has(entry.token)) {
                    await deleteDoc(doc(db, 'expoTokens', entry.id));
                    console.log(`🗑️ 중복 푸시토큰 삭제됨: ${entry.token} (email: ${email})`);
                } else {
                    seen.add(entry.token);
                }
            }
        }

        // console.log('✅ 중복 토큰 정리 완료');
    } catch (err) {
        console.error('❌ 중복 토큰 정리 실패:', err);
    }
}
