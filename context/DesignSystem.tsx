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

export const lightColors: Colors = {
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

export const darkColors: Colors = {
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

export type DesignSystemType = {
  font: Font;
  spacing: typeof spacing;
  radius: typeof radius;
  colors: Colors;
};

export type UseDesignReturnType = DesignSystemType & {
  colors: Colors;
};

const defaultDesignSystem: DesignSystemType = {
  font,
  spacing,
  radius,
  colors: lightColors,
};

const DesignContext = createContext<DesignSystemType>(defaultDesignSystem);

export const DesignSystemProvider = ({ children }: { children: React.ReactNode }) => {
  return <DesignContext.Provider value={defaultDesignSystem}>{children}</DesignContext.Provider>;
};

export const useDesign = (): UseDesignReturnType => {
  const design = useContext(DesignContext);
  const { colors } = useAppTheme();
  return { ...design, colors };
};
