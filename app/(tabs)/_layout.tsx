import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const tabBarBackgroundColor = isDark ? '#1f2937' : '#ffffff';
    const tabBarBorderColor = isDark ? '#374151' : '#e5e7eb';
    const tabBarTextActive = '#2563eb';
    const tabBarTextInactive = isDark ? '#9ca3af' : '#999999';

    return (
        <Tabs
            screenOptions={({ route }) => {
                const baseHeight = Platform.OS === 'android' ? 60 : 65;
                return {
                    headerShown: false,
                    tabBarActiveTintColor: tabBarTextActive,
                    tabBarInactiveTintColor: tabBarTextInactive,
                    tabBarStyle: {
                        backgroundColor: tabBarBackgroundColor,
                        borderTopColor: tabBarBorderColor,
                        borderTopWidth: 1,
                        height: baseHeight + insets.bottom, // ✅ 안전 여백 포함
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
            <Tabs.Screen name="index" options={{ title: '홈' }} />
            <Tabs.Screen name="catechism" options={{ title: '교리문답' }} />
            <Tabs.Screen name="departments" options={{ title: '부서' }} />
            <Tabs.Screen name="teams" options={{ title: '소모임' }} />
            <Tabs.Screen name="settings" options={{ title: '설정' }} />
        </Tabs>
    );
}
