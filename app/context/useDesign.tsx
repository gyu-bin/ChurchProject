import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import { Font } from './types';

export const font: Font = {
    heading: 20,
    body: 16,
    caption: 14,
    title: 18,
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const radius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
};

export function useDesign() {
    const { colors } = useContext(ThemeContext);
    return { colors, font, spacing, radius };
} 