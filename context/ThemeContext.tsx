import React, { createContext, useContext, useEffect, useState } from 'react';
import { Colors } from './types';
import { useColorScheme } from 'react-native';

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
    const [mode, setMode] = useState<ThemeMode>(systemColorScheme || 'light');
    const colors = mode === 'dark' ? darkColors : lightColors;

    useEffect(() => {
        // 시스템 테마 변경 감지
        if (systemColorScheme) {
            setMode(systemColorScheme);
        }
    }, [systemColorScheme]);

    const toggleTheme = () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    };

    const setThemeMode = (newMode: ThemeMode) => {
        setMode(newMode);
    };

    return (
        <ThemeContext.Provider value={{ colors, mode, toggleTheme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useAppTheme = () => useContext(ThemeContext);
