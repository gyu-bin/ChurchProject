// screens/TeamsTabNavigator.tsx
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import TeamsList from '../teams/TeamsList';
import Community from '../teams/FeedList';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Platform, useColorScheme} from 'react-native';
import {useDesign} from "@/context/DesignSystem";

const Tab = createMaterialTopTabNavigator();

export default function TeamsTabNavigator() {
    const insets = useSafeAreaInsets();
    const { colors, spacing, font } = useDesign();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: colors.background,
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 1,
                    borderBottomColor: '#ddd',
                    paddingTop: Platform.OS === 'android' ? insets.top : insets.top - 10,
                },
                tabBarIndicatorStyle: { backgroundColor: '#007AFF' },
                tabBarLabelStyle: { fontWeight: 'bold' },
                swipeEnabled: true,
                animationEnabled: true,
                lazy: true,
            }}
        >
            <Tab.Screen name="소모임 리스트" component={TeamsList} />
            <Tab.Screen name="커뮤니티" component={Community} />
        </Tab.Navigator>
    );
}
