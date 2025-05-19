// services/firestoreService.ts
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

export const listenToTeamMessages = (teamId: string, callback: (messages: any[]) => void) => {
    const q = query(collection(db, 'teams', teamId, 'chats'), orderBy('createdAt'));
    return onSnapshot(q, snapshot => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(msgs);
    });
};

// ✅ 이거 추가하세요
export const sendTeamMessage = async (teamId: string, message: any) => {
    const messagesRef = collection(db, 'teams', teamId, 'chats');
    await addDoc(messagesRef, {
        ...message,
        createdAt: serverTimestamp(),
    });
};
