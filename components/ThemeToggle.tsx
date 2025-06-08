import { useDesign } from '@/app/context/DesignSystem';
import { useAppTheme } from '@/app/context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function ThemeToggle() {
    const { mode, toggleTheme } = useAppTheme();
    const isDark = mode === 'dark';
    const { colors } = useDesign();

    return (
        <Pressable
            onPress={toggleTheme}
            style={[
                styles.wrapper,
                {
                    backgroundColor: isDark ? colors.primary : '#efefef',
                    borderColor: isDark ? '#4a6cf7' : '#ddd',
                },
            ]}
        >
            <View style={[styles.icon, { opacity: isDark ? 1 : 0 }]}>
                <Feather name="sun" size={20} color="#fff" />
            </View>
            <View style={[styles.icon, { opacity: isDark ? 0 : 1 }]}>
                <Feather name="moon" size={16} color="#000" />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    icon: {
        position: 'absolute',
    },
});
