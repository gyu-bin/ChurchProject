import { useDesign } from '@/context/DesignSystem';
import { ScrollCallbackProvider, useScrollCallback } from '@/context/ScrollCallbackContext';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Community from '../teams/FeedList';
import TeamsList from '../teams/TeamsList';

const Tab = createMaterialTopTabNavigator();

function TeamsTabInner() {
  const insets = useSafeAreaInsets();
  const { colors, spacing, font } = useDesign();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation() as any;
  const [currentTab, setCurrentTab] = useState('teams');
  const { runScrollCallback } = useScrollCallback();

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('state', (e: any) => {
      const idx = e.data.state.index;
      const routeName = e.data.state.routeNames[idx];
      setCurrentTab(routeName === '소모임 리스트' ? 'teams' : 'community');
    });
    const unsubscribeTab = navigation.addListener('tabPress', () => {
      runScrollCallback(currentTab);
    });
    return () => {
      unsubscribeFocus();
      unsubscribeTab();
    };
  }, [navigation, currentTab, runScrollCallback]);

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
      }}>
      <Tab.Screen name='소모임 리스트' component={TeamsList} />
      <Tab.Screen name='커뮤니티' component={Community} />
    </Tab.Navigator>
  );
}
export default function TeamsTabNavigator() {
  return (
    <ScrollCallbackProvider>
      <TeamsTabInner />
    </ScrollCallbackProvider>
  );
}

