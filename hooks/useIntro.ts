// hooks/useIntro.ts
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useIntro() {
    const [introShown, setIntroShown] = useState<boolean | null>(null);

    useEffect(() => {
        AsyncStorage.getItem('introShown').then((value) => {
            setIntroShown(value === 'true');
        });
    }, []);

    const markIntroAsShown = async () => {
        await AsyncStorage.setItem('introShown', 'true');
        setIntroShown(true);
    };

    return { introShown, markIntroAsShown };
}
