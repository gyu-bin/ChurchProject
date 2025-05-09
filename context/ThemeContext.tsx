// context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
    mode: ThemeMode;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    mode: 'light',
    toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('light');

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
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        await AsyncStorage.setItem('themeMode', newMode);
    };

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useAppTheme = () => useContext(ThemeContext);
