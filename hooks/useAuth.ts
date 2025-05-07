import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/services/authService';

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await getCurrentUser();
                // console.log('[useAuth] 로그인된 사용자:', currentUser);
                setUser(currentUser);
            } catch (e) {
                // console.error('[useAuth] 사용자 정보 가져오기 실패:', e);
                setUser(null); // 에러 시 null 처리
            } finally {
                setLoading(false); // 무조건 로딩 false 처리
            }
        };

        checkAuth();
    }, []);

    return { user, loading };
}
