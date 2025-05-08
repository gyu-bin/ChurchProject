// services/notificationService.ts
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

export async function sendNotification({ to, text, link }: { to: string; text: string; link?: string }) {
    await addDoc(collection(db, 'notifications'), {
        to,
        message: text,
        link: link ?? null, // 🔽 링크 추가
        createdAt: new Date(),
    });
}
