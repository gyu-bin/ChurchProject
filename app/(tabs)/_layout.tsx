import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#2563eb',
                tabBarInactiveTintColor: colorScheme === 'dark' ? '#888' : '#999',
                tabBarStyle: {
                    backgroundColor: colorScheme === 'dark' ? '#111' : '#fff',
                    borderTopColor: colorScheme === 'dark' ? '#222' : '#eee',
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
