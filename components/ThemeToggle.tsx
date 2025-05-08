// components/ThemeToggle.tsx
import React from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';

export default function ThemeToggle() {
    const { mode, toggleTheme } = useAppTheme();
    const isDark = mode === 'dark';
    const { colors } = useDesign();

    return (
        <Pressable
            onPress={toggleTheme}
            style={[
                styles.wrapper,
                { backgroundColor: isDark ? colors.primary : '#efefef', borderColor: isDark ? '#4a6cf7' : '#ddd' },
            ]}
        >
            <Feather
                name="sun"
                size={20}
                color={isDark ? '#fff' : '#000'}
                style={[styles.icon, { opacity: isDark ? 1 : 0 }]}
            />
            <Feather
                name="moon"
                size={16}
                color={isDark ? '#000' : '#000'}
                style={[styles.icon, { opacity: isDark ? 0 : 1 }]}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: 46,
        height: 46,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    icon: {
        position: 'absolute',
        transitionDuration: '300ms',
    },
});
