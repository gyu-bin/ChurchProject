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
import { Colors, ThemeContextType } from './types';

export const lightTheme: Colors = {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    primary: '#2563EB',
    secondary: '#3B82F6',
    text: '#1F2937',
    subtext: '#6B7280',
    border: '#E5E7EB',
    card: '#F3F4F6',
    error: '#EF4444',
    placeholder: '#9CA3AF',
    success: '#22C55E',
    warning: '#F59E0B',
};

export const darkTheme: Colors = {
    background: '#111827',
    surface: '#1F2937',
    primary: '#3B82F6',
    secondary: '#60A5FA',
    text: '#F9FAFB',
    subtext: '#9CA3AF',
    border: '#374151',
    card: '#374151',
    error: '#EF4444',
    placeholder: '#6B7280',
    success: '#22C55E',
    warning: '#F59E0B',
};

const ThemeContext = createContext<ThemeContextType>({
    colors: lightTheme,
    mode: 'light',
    toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<'light' | 'dark'>('light');
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
                isInteraction: false,
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

    const colors = mode === 'light' ? lightTheme : darkTheme;

    return (
        <ThemeContext.Provider value={{ colors, mode, toggleTheme }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                {children}
            </Animated.View>
        </ThemeContext.Provider>
    );
}

export function useAppTheme() {
    return useContext(ThemeContext);
} 