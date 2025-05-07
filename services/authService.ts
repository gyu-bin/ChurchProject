import { getDoc, doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/firebase/config';

export async function login(email: string, password: string) {
    const snapshot = await getDoc(doc(db, 'users', email));
    if (!snapshot.exists()) throw new Error('존재하지 않는 사용자입니다.');

    const user = snapshot.data();

    if (user.password !== password) throw new Error('비밀번호가 틀렸습니다.');
    if (!user.approved) throw new Error('관리자 승인이 필요합니다.');

    await AsyncStorage.setItem('currentUser', JSON.stringify(user));
    return user;
}

export async function getCurrentUser() {
    const raw = await AsyncStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
}

export async function logout() {
    await AsyncStorage.removeItem('currentUser');
}
