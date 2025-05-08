import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/services/authService';
import { AppState } from 'react-native';

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadUser = async () => {
        const u = await getCurrentUser();
        setUser(u);
        setLoading(false);
    };

    useEffect(() => {
        loadUser();

        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') loadUser();
        });

        return () => subscription.remove();
    }, []);

    return { user, loading };
}
