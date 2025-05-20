//services/authService.ts
import {getDoc, doc, updateDoc} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/firebase/config';

export async function login(email: string, password: string) {
    const snapshot = await getDoc(doc(db, 'users', email));
    if (!snapshot.exists()) throw new Error('존재하지 않는 사용자입니다.');

    const user = snapshot.data();

    if (user.password !== password) throw new Error('비밀번호가 틀렸습니다.');
    // if (!user.approved) throw new Error('관리자 승인이 필요합니다.');

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
export async function reauthenticate(email: string, oldPassword: string) {
    const snapshot = await getDoc(doc(db, 'users', email));
    if (!snapshot.exists()) throw new Error('존재하지 않는 사용자입니다.');

    const user = snapshot.data();
    if (user.password !== oldPassword) throw new Error('기존 비밀번호가 일치하지 않습니다.');
}


export async function changePassword(newPassword: string) {
    const raw = await AsyncStorage.getItem('currentUser');
    if (!raw) throw new Error('로그인 정보가 없습니다.');

    const user = JSON.parse(raw);
    const email = user.email;
    if (!email) throw new Error('이메일 정보가 없습니다.');

    await updateDoc(doc(db, 'users', email), { password: newPassword });

    // 로컬 저장된 비밀번호도 업데이트
    const updatedUser = { ...user, password: newPassword };
    await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
}
