import { getDoc, doc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/firebase/config';
import bcrypt from 'bcryptjs';

export async function login(email: string, inputPassword: string) {
    console.log(`[AUTH] 로그인 시도: ${email}`);
    const ref = doc(db, 'users', email);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        console.log(`[AUTH] 로그인 실패: 계정이 존재하지 않음 (${email})`);
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

    console.log(`[AUTH] 로그인 성공: ${email}`);
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
    console.log('[AUTH] 로그아웃 처리 시작');
    try {
        await AsyncStorage.removeItem('currentUser');
        await AsyncStorage.setItem('isLoggedIn', 'false');
        await AsyncStorage.removeItem('autoLogin');
        console.log('[AUTH] 로그아웃 완료: 모든 세션 데이터 삭제됨');
    } catch (error) {
        console.error('[AUTH] 로그아웃 중 오류:', error);
        throw error;
    }
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
