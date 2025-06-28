import React, { createContext, useContext, useEffect, useState } from 'react';
import { Colors } from './types';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'user_theme_preference';

const lightColors: Colors = {
    primary: '#2B5CE7',
    background: '#f5f5f5',
    card: '#ffffff',
    text: '#222222',
    border: '#e0e0e0',
    notification: '#ff3b30',
    surface: '#ffffff',
    error: '#ff3b30',
    subtext: '#888888',
    accent: '#4cd964',
    buttonText: '#ffffff',
    placeholder: '#aaaaaa',
    success: '#4cd964',
    warning: '#ffcc00',
    info: '#34aadc',
};

const darkColors: Colors = {
    primary: '#4D78FF',
    background: '#121212',
    card: '#1E1E1E',
    text: '#EEEEEE',
    border: '#303030',
    notification: '#FF453A',
    surface: '#282828',
    error: '#FF453A',
    subtext: '#9E9E9E',
    accent: '#30D158',
    buttonText: '#FFFFFF',
    placeholder: '#666666',
    success: '#30D158',
    warning: '#FFD60A',
    info: '#5AC8FA',
};

type ThemeMode = 'light' | 'dark';

type ThemeContextType = {
    colors: Colors;
    mode: ThemeMode;
    toggleTheme: () => void;
    setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    colors: lightColors,
    mode: 'light',
    toggleTheme: () => {},
    setThemeMode: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useColorScheme() as ThemeMode;
    // 초기값은 시스템 테마로 설정하지만, AsyncStorage에서 사용자 설정 불러오기
    const [mode, setMode] = useState<ThemeMode>(systemColorScheme || 'light');
    const [isThemeLoaded, setIsThemeLoaded] = useState(false);
    const colors = mode === 'dark' ? darkColors : lightColors;

    // 앱 시작 시 AsyncStorage에서 사용자 테마 설정 불러오기
    useEffect(() => {
        const loadUserTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme) {
                    setMode(savedTheme as ThemeMode);
                }
            } catch (e) {
                console.error('테마 설정 불러오기 실패:', e);
            } finally {
                setIsThemeLoaded(true);
            }
        };

        loadUserTheme();
    }, []);

    // 테마 변경 시 AsyncStorage에 저장
    const saveThemeToStorage = async (themeMode: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode);
        } catch (e) {
            console.error('테마 설정 저장 실패:', e);
        }
    };

    const toggleTheme = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        saveThemeToStorage(newMode);
    };

    const setThemeMode = (newMode: ThemeMode) => {
        setMode(newMode);
        saveThemeToStorage(newMode);
    };

    return (
        <ThemeContext.Provider value={{ colors, mode, toggleTheme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useAppTheme = () => useContext(ThemeContext);
