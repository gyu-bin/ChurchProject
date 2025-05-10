import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, View } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext'; // ✅ 여기를 사용

export default function TabLayout() {
    const { mode } = useAppTheme(); // ✅ 커스텀 훅 사용
    const isDark = mode === 'dark';

    const tabBarBackgroundColor = isDark ? '#1f2937' : '#ffffff';
    const tabBarBorderColor = isDark ? '#374151' : '#e5e7eb';
    const tabBarTextActive = '#2563eb';
    const tabBarTextInactive = isDark ? '#9ca3af' : '#999999';

    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: tabBarTextActive,
                tabBarInactiveTintColor: tabBarTextInactive,
                tabBarStyle: {
                    backgroundColor: tabBarBackgroundColor,
                    borderTopColor: tabBarBorderColor,
                    borderTopWidth: 1,
                    height: Platform.OS === 'android' ? 78 : 75,
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
            })}
        >
            <Tabs.Screen name="index" options={{ title: '홈' }} />
            <Tabs.Screen name="catechism" options={{ title: '교리문답' }} />
            <Tabs.Screen name="departments" options={{ title: '부서' }} />
            <Tabs.Screen name="teams" options={{ title: '소모임' }} />
            <Tabs.Screen name="settings" options={{ title: '설정' }} />
        </Tabs>
    );
}
