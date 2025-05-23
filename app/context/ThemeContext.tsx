import { createContext, useContext } from 'react';
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

export const ThemeContext = createContext<ThemeContextType>({
    colors: lightTheme,
    mode: 'light',
    toggleTheme: () => {},
});

export const useAppTheme = () => useContext(ThemeContext); 