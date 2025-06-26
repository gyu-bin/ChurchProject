import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/services/authService';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadUser = async () => {
        try {
            const [isLoggedIn, currentUser] = await Promise.all([
                AsyncStorage.getItem('isLoggedIn'),
                AsyncStorage.getItem('currentUser')
            ]);

            // isLoggedIn이 명시적으로 'false'이거나 currentUser가 없는 경우
            if (isLoggedIn !== 'true' || !currentUser) {
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const userData = JSON.parse(currentUser);
                setUser(userData);

                // 사용자 데이터가 유효한지 확인 (최소한 email 필드가 있어야 함)
                if (!userData || !userData.email) {
                    throw new Error('유효하지 않은 사용자 데이터');
                }

                // 백그라운드에서 최신 데이터 업데이트 시도
                try {
                    // Firestore에서 최신 사용자 데이터 확인
                    const userDoc = await getDoc(doc(db, 'users', userData.email));

                    if (userDoc.exists()) {
                        const freshUserData = userDoc.data();
                        const freshUser = { ...freshUserData, email: userData.email };
                        setUser(freshUser);
                        await AsyncStorage.setItem('currentUser', JSON.stringify(freshUser));
                    } else {
                        // 사용자가 Firestore에 더 이상 존재하지 않는 경우 (삭제된 계정)
                        throw new Error('사용자가 더 이상 존재하지 않습니다');
                    }
                } catch (error) {
                    const firebaseError = error as Error;
                    console.error('Firestore 사용자 정보 로드 실패:', firebaseError);
                    // 중요한 오류인 경우 로그아웃 처리
                    if (firebaseError.message === '사용자가 더 이상 존재하지 않습니다') {
                        throw firebaseError; // 다시 던져서 outer catch에서 처리
                    }
                    // 일시적인 네트워크 오류 등의 경우 현재 사용자 정보 유지
                }
            } catch (error) {
                const parseError = error as Error;
                console.error('사용자 데이터 파싱 오류:', parseError);
                throw new Error('저장된 사용자 정보가 손상되었습니다');
            }
        } catch (error) {
            const err = error as Error;
            console.error('사용자 로드 중 오류:', err.message);
            // 오류 발생 시 사용자 상태 초기화 및 로그아웃 처리
            setUser(null);
            await AsyncStorage.removeItem('currentUser');
            await AsyncStorage.setItem('isLoggedIn', 'false');
            await AsyncStorage.removeItem('autoLogin');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    // AppState 이벤트 리스너 추가
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                setLoading(true); // 앱이 활성화될 때 로딩 상태로 설정
                loadUser();
            }
        });

        return () => subscription.remove();
    }, []);

    return { user, loading, reload: loadUser };
}
