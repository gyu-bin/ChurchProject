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
    LayoutAnimation,
    Platform,
    UIManager
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
    mode: ThemeMode;
    toggleTheme: () => void;
    animatedValue: Animated.Value;
}

const ThemeContext = createContext<ThemeContextValue>({
    mode: 'light',
    toggleTheme: () => {},
    animatedValue: new Animated.Value(0)
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
                                                                           children
                                                                       }) => {
    const [mode, setMode] = useState<ThemeMode>('light');
    const animatedValue = useRef(new Animated.Value(0)).current;

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

    // 모드 변경 시 애니메이션 적용


    const toggleTheme = async () => {
        const nextMode: ThemeMode = mode === 'light' ? 'dark' : 'light';

        // 애니메이션 먼저 실행하고 끝나면 모드 전환
        Animated.timing(animatedValue, {
            toValue: nextMode === 'dark' ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start(() => {
            setMode(nextMode);
        });

        await AsyncStorage.setItem('themeMode', nextMode);
    };



    return (
        <ThemeContext.Provider value={{ mode, toggleTheme, animatedValue }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useAppTheme = () => useContext(ThemeContext);
