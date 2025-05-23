import React, { useState } from 'react';
import { ThemeContext, darkTheme, lightTheme } from './ThemeContext';
import { Colors } from './types';

type ThemeProviderProps = {
    children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [mode, setMode] = useState<'light' | 'dark'>('light');
    const colors: Colors = mode === 'light' ? lightTheme : darkTheme;

    const toggleTheme = () => {
        setMode(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ colors, mode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
} 