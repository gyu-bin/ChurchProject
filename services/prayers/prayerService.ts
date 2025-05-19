import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp,
    getDoc,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Prayer } from '@/types/prayer';

export const fetchPrayersFromFirestore = async (): Promise<Prayer[]> => {
    const snapshot = await getDocs(collection(db, 'prayers'));
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Prayer[];
};

export const addPrayer = async (prayer: {
    title: string;
    content: string;
    author: string;
}): Promise<Prayer> => {
    const docRef = await addDoc(collection(db, 'prayers'), {
        ...prayer,
        createdAt: serverTimestamp(),
    });

    const savedDoc = await getDoc(docRef);
    const data = savedDoc.data();

    return {
        id: docRef.id,
        title: data?.title,
        content: data?.content,
        author: data?.author,
        createdAt: data?.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    };
};

export const deletePrayer = async (id: string) => {
    await deleteDoc(doc(db, 'prayers', id));
};
export const listenToPrayers = (callback: (prayers: Prayer[]) => void) => {
    const colRef = collection(db, 'prayers');
    return onSnapshot(colRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Prayer[];
        callback(data);
    });
};
