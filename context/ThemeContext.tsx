import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider as StyledThemeProvider } from 'styled-components/native';
import { Colors } from './types';
import { darkColors, lightColors, font, radius, spacing } from './DesignSystem';

const THEME_STORAGE_KEY = 'user_theme_preference';

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
      <StyledThemeProvider theme={{ colors, font, radius, spacing }}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
