// 📁 NoticeManager.tsx (루트 파일)
import { useDesign } from '@/app/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Platform, SafeAreaView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SceneMap, TabBar, TabView } from 'react-native-tab-view';
import EventTab from './noticeTab/eventTab';
import NoticeTab from './noticeTab/noticeTab';
import ScheduleTab from './noticeTab/scheduleTab';

export default function NoticeManager() {
  const insets = useSafeAreaInsets();
  const { colors, spacing, font } = useDesign();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'notice', title: '공지' },
    { key: 'schedule', title: '일정' }, 
    { key: 'event', title: '배너' },
  ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top + 20 : insets.top + 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: 30 }}>
        <Ionicons name="arrow-back" size={24} color={colors.text} onPress={() => router.back()} />
        <Text style={{ fontSize: font.heading, fontWeight: '600', color: colors.text, textAlign: 'center', flex: 1 }}>공지사항 관리</Text>
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={SceneMap({
          notice: NoticeTab,
          schedule: ScheduleTab,
          event: EventTab,
        })}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: colors.primary }}
            style={{ backgroundColor: colors.surface }}
            activeColor={colors.primary}
            inactiveColor={colors.subtext}
          />
        )}
      />
    </SafeAreaView>
  );
}
