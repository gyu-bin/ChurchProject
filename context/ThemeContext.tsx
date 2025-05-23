import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState
} from 'react';
import {
    Animated,
    Appearance,
    Platform,
    UIManager
} from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'light',
    toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>('light');
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Android에서 LayoutAnimation 활성화
    if (
        Platform.OS === 'android' &&
        UIManager.setLayoutAnimationEnabledExperimental
    ) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    // 시스템 또는 저장된 테마 적용
    useEffect(() => {
        const loadTheme = async () => {
            const saved = await AsyncStorage.getItem('themeMode');
            if (saved === 'dark' || saved === 'light') {
                setMode(saved);
            } else {
                const systemTheme = Appearance.getColorScheme();
                setMode(systemTheme === 'dark' ? 'dark' : 'light');
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const nextMode = mode === 'light' ? 'dark' : 'light';

        // 페이드 아웃과 인을 동시에 실행
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 0.8,
                duration: 100,
                useNativeDriver: true,
                isInteraction: false, // 인터랙션 플래그 비활성화
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
                isInteraction: false,
            })
        ]).start();

        // 테마 변경을 바로 실행
        setMode(nextMode);
        AsyncStorage.setItem('themeMode', nextMode);
    };

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                {children}
            </Animated.View>
        </ThemeContext.Provider>
    );
}

export function useAppTheme() {
    return useContext(ThemeContext);
}
