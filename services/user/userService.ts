// services/userService.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

export const getUserData = async (uid: string) => {
    const docRef = doc(db, 'users', uid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) throw new Error('User not found');

    const data = snapshot.data();
    return {
        uid,
        name: data.name,
        campus: data.campus,
        division: data.division,
        role: data.role,
    };
};
