import {Tabs, usePathname} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, {useRef} from 'react';
import { Platform } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {useAppSelector} from "@/hooks/useRedux";
import {RootState} from "@/redux/store";
import { getScrollCallback } from '@/utils/scrollRefManager';

export default function TabLayout() {
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const tabBarBackgroundColor = isDark ? '#1f2937' : '#ffffff';
    const tabBarBorderColor = isDark ? '#374151' : '#e5e7eb';
    const tabBarTextActive = '#2563eb';
    const tabBarTextInactive = isDark ? '#9ca3af' : '#999999';
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
                            case 'index':
                                iconName = 'home-outline';
                                break;
                            case 'catechism':
                                iconName = 'book-outline';
                                break;
                            case 'departments':
                                iconName = 'business-outline';
                                break;
                            case 'teams':
                                iconName = 'people-outline';
                                break;
                            case 'settings':
                                iconName = 'settings-outline';
                                break;
                        }
                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                };
            }}
        >
            <Tabs.Screen
                name="index"
                options={{ title: '홈' }}
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
                name="catechism"
                options={{ title: '교리문답' }}
                listeners={{
                    tabPress: () => {
                                 if (pathname === '/') {
                                     const cb = getScrollCallback('index');
                                     cb?.();
                                 }
                             },
                }}/>
            <Tabs.Screen
                name="departments"
                options={{ title: '부서' }}
                listeners={{
                             tabPress: () => {
                                 if (pathname === '/') {
                                     const cb = getScrollCallback('index');
                                     cb?.();
                                 }
                             },
                }}/>
            <Tabs.Screen
                name="teams"
                options={{ title: '소모임' }}
                listeners={{
                    tabPress: () => {
                        const cb = getScrollCallback('teams');
                        cb?.(); // 👈 이 부분이 핵심입니다
                    },
                }}/>
            <Tabs.Screen
                name="settings"
                options={{ title: '설정' }}
                listeners={{
                    tabPress: () => {
                        const cb = getScrollCallback('settings');
                        cb?.(); // 👈 이 부분이 핵심입니다
                    },
                }}/>
        </Tabs>
    );
}
