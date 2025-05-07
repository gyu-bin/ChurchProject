import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
      <Tabs screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="index" options={{ title: "홈" }} />
          <Tabs.Screen name="catechism" options={{ title: "교리문답" }} />
          <Tabs.Screen name="departments" options={{ title: "부서" }} />
          <Tabs.Screen name="teams" options={{ title: "소모임" }} />
          <Tabs.Screen name="settings" options={{ title: "설정" }} />
      </Tabs>
  );
}
