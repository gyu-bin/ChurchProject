import { useAppTheme } from "@/app/context/ThemeContext";
import { useAppSelector } from "@/hooks/useRedux";
import { RootState } from "@/redux/store";
import { getScrollCallback } from '@/utils/scrollRefManager';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import React, { useRef } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const tabBarBackgroundColor = isDark ? '#1a1a1a' : '#ffffff';
    const tabBarBorderColor = isDark ? '#2d2d2d' : '#e5e7eb';
    const tabBarTextActive = '#2563eb';
    const tabBarTextInactive = isDark ? '#666666' : '#999999';
    const pathname = usePathname(); // ✅ 여기에 있어야 함
    const scrollRefMap = useAppSelector((state: RootState) => state.scrollRef.refMap); // ✅ 여기도
    const lastPressTimestamps = useRef<Record<string, number>>({}); // ✅ 이 부분도

    return (
        <Tabs
            screenOptions={({ route }) => {
                const baseHeight = Platform.OS === 'android' ? 60 : 75;
                return {
                    headerShown: false,
                    tabBarShowLabel: true, // 꼭 label 표시 설정
                    tabBarActiveTintColor: tabBarTextActive,
                    tabBarInactiveTintColor: tabBarTextInactive,
                    tabBarStyle: {
                        backgroundColor: tabBarBackgroundColor,
                        borderTopColor: tabBarBorderColor,
                        borderTopWidth: 1,
                        height: Platform.OS === 'android' ? baseHeight + insets.bottom : baseHeight, // ✅ 안전 여백 포함
                        paddingBottom: Platform.OS === 'android' ? 0 : insets.bottom, // iOS에서만 padding 적용
                        paddingTop: 4,
                    },
                    tabBarIcon: ({ color, size }) => {
                        let iconName: keyof typeof Ionicons.glyphMap = 'home';
                        switch (route.name) {
                            case 'nanum':
                                iconName = 'book-outline';
                                break;
                            case 'departments':
                                iconName = 'business-outline';
                                break;
                            case 'index':
                                iconName = 'home-outline';
                                break;
                            case 'teams':
                                iconName = 'people-outline';
                                break;
                            case 'settings':
                                iconName = 'accessibility-outline';
                                break;
                        }
                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                };
            }}
        >
            <Tabs.Screen
                name="teams"
                options={{ title: '모임' }}
                listeners={{
                    tabPress: () => {
                        const cb = getScrollCallback('teams');
                        cb?.();
                    },
                }}
            />
            <Tabs.Screen
                name="nanum"
                options={{ title: '나눔' }}
                listeners={{
                    tabPress: () => {
                        const cb = getScrollCallback('nanum');
                        cb?.();
                    },
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: '',
                    tabBarIcon: ({ color, size }) => (
                        <View style={{
                            width: 60,
                            height: 60,
                            backgroundColor: '#6366f1',
                            borderRadius: 30,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 20,
                            borderWidth: 4,
                            borderColor: '#ffffff'
                        }}>
                            <Ionicons name="home-outline" size={size} color="#ffffff" />
                        </View>
                    ),
                }}
                listeners={{
                    tabPress: () => {
                        if (pathname === '/') {
                            const cb = getScrollCallback('index');
                            cb?.();
                        }
                    },
                }}
            />
            <Tabs.Screen
                name="departments"
                options={{ title: '부서활동' }}
                listeners={{
                    tabPress: () => {
                        if (pathname === '/') {
                            const cb = getScrollCallback('departments');
                            cb?.();
                        }
                    },
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{ title: '마이페이지' }}
                listeners={{
                    tabPress: () => {
                        const cb = getScrollCallback('settings');
                        cb?.();
                    },
                }}
            />
        </Tabs>
    );
}
