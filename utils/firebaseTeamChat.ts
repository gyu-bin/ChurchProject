// utils/firebaseTeamChat.ts
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase/config';

export const sendTeamMessage = async (teamId: string, senderEmail: string, text: string) => {
    const messagesRef = collection(db, 'teams', teamId, 'chats');
    await addDoc(messagesRef, {
        sender: senderEmail,
        text,
        timestamp: serverTimestamp(),
    });
};

export const subscribeToTeamChat = (teamId: string, callback: (msgs: any[]) => void) => {
    const q = query(collection(db, 'teams', teamId, 'chats'), orderBy('timestamp'));
    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(msgs);
    });
};
