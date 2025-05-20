import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';

export default function ThemeToggle() {
    const { mode, toggleTheme } = useAppTheme();
    const isDark = mode === 'dark';
    const { colors } = useDesign();

    const animatedValue = useRef(new Animated.Value(isDark ? 1 : 0)).current;

    // 테마 변경 시 애니메이션 트리거
    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: isDark ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isDark]);

    const sunOpacity = animatedValue;
    const moonOpacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

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
            <Animated.View style={[styles.icon, { opacity: sunOpacity }]}>
                <Feather name="sun" size={20} color="#fff" />
            </Animated.View>
            <Animated.View style={[styles.icon, { opacity: moonOpacity }]}>
                <Feather name="moon" size={16} color="#000" />
            </Animated.View>
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
    },
});
