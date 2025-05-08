// context/DesignSystem.tsx

import React, { createContext, useContext } from 'react';
import { useAppTheme } from './ThemeContext';
import { LightTheme, DarkTheme } from '@/constants/Colors';

const DesignContext = createContext(LightTheme);

export const DesignSystemProvider = ({ children }: { children: React.ReactNode }) => {
    const { mode } = useAppTheme();
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    return <DesignContext.Provider value={theme}>{children}</DesignContext.Provider>;
};

export const useDesign = () => useContext(DesignContext);
