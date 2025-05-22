import { getDoc, doc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/firebase/config';
import bcrypt from 'bcryptjs';

export async function login(email: string, inputPassword: string) {
    const ref = doc(db, 'users', email);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        throw new Error('존재하지 않는 계정입니다.');
    }

    const user = snap.data();

    const savedPassword = user.password;

    // case 1. bcrypt 해시된 경우
    if (savedPassword.startsWith('$2a$') || savedPassword.startsWith('$2b$')) {
        const match = await bcrypt.compare(inputPassword, savedPassword);
        if (!match) throw new Error('비밀번호가 일치하지 않습니다.');
    } else {
        // case 2. 평문 저장된 경우
        if (inputPassword !== savedPassword) {
            throw new Error('비밀번호가 일치하지 않습니다.');
        }
    }

    // ✅ 배포용 login (해시 기반만 허용)
    /*if (typeof savedPassword === 'string' && (savedPassword.startsWith('$2a$') || savedPassword.startsWith('$2b$'))) {
        const match = bcrypt.compareSync(inputPassword, savedPassword);
        if (!match) throw new Error('비밀번호가 일치하지 않습니다.');
    } else {
        throw new Error('비밀번호 형식이 유효하지 않습니다.');
    }*/

    return {
        ...user,
        email,
    };
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
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) throw new Error('기존 비밀번호가 일치하지 않습니다.');
}

export async function changePassword(newPassword: string) {
    const raw = await AsyncStorage.getItem('currentUser');
    if (!raw) throw new Error('로그인 정보가 없습니다.');

    const user = JSON.parse(raw);
    const email = user.email;
    if (!email) throw new Error('이메일 정보가 없습니다.');

    const hashed = await bcrypt.hash(newPassword, 10);
    await updateDoc(doc(db, 'users', email), { password: hashed });

    const updatedUser = { ...user, password: hashed };
    await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
}
