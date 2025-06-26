import React, { createContext, useContext } from 'react';
import { useAppTheme } from './ThemeContext';
import { Colors, Font } from './types';

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

export type DesignSystemType = {
    font: Font;
    spacing: typeof spacing;
    radius: typeof radius;
};

export type UseDesignReturnType = DesignSystemType & {
    colors: Colors;
};

const defaultDesignSystem: DesignSystemType = {
    font,
    spacing,
    radius,
};

const DesignContext = createContext<DesignSystemType>(defaultDesignSystem);

export const DesignSystemProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <DesignContext.Provider value={defaultDesignSystem}>
            {children}
        </DesignContext.Provider>
    );
};

export const useDesign = (): UseDesignReturnType => {
    const design = useContext(DesignContext);
    const { colors } = useAppTheme();
    return { ...design, colors };
}; 
