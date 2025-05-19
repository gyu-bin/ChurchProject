// services/teamService.ts
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

export const fetchTeamsFromFirestore = async () => {
    const snapshot = await getDocs(collection(db, 'teams'));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
};
