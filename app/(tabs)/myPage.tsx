import PushSettings from '@/app/myPage/VerseNotificationSettings';
import ThemeToggle from '@/components/ThemeToggle';
import { db } from '@/firebase/config';
import { setScrollCallback } from '@/utils/scrollRefManager';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, ScrollView, Text, TouchableOpacity, UIManager, View } from 'react-native';
import Toast from 'react-native-root-toast';

import MyScreenContainer from '@/components/my/_common/ScreenContainer';
import ScreenHeader from '@/components/my/_common/ScreenHeader';
import SettingCard from '@/components/my/_common/SettingCard';
import { ProfileCard } from '@/components/my/ProfileCard';
import { User } from '@/constants/_types/user';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import styled from 'styled-components/native';
// import performance from '../myPage/'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MyScreen() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(authUser);

  useEffect(() => {
    setUser(authUser);
  }, [authUser]);

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const router = useRouter();
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';
  const { colors } = useDesign();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setScrollCallback('myPage', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, []);

  const handleUpgrade = async () => {
    if (!user?.email) return;

    const updatedUser = { ...user, role: '정회원' } as User;
    await updateDoc(doc(db, 'users', user.email), { role: '정회원' });
    await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setShowUpgradeModal(false);
    Toast.show('✅ 정회원으로 전환되었습니다.', {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
    });
  };

  return (
    <MyScreenContainer scrollRef={scrollRef}>
      <ScreenHeader title='마이페이지'>
        <TouchableOpacity onPress={() => router.push('/myPage/setting')}>
          <Ionicons name='settings-outline' size={24} color={colors.text} />
        </TouchableOpacity>
      </ScreenHeader>

      {user && <ProfileCard user={user} handleUserUpdate={handleUserUpdate} />}

      {/* 일반 설정 섹션 */}
      <View style={{ marginBottom: 32 }}>
        <SettingSectionHeader color={colors.text}>일반</SettingSectionHeader>

        <View style={{ gap: 12 }}>
          {/* 알림 설정 */}
          <View
            style={{
              backgroundColor: colors.surface,
              padding: 20,
              borderRadius: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}>
            <PushSettings />
          </View>
          {/* 내 모임 관리 */}
          <SettingCard
            title='내 모임 관리'
            icon={{
              name: 'accessibility-outline',
              color: '#10b981',
              backgroundColor: '#d1fae5',
            }}
            onPress={() => router.push('/myPage/joinTeams')}
          />

          {/* 다크모드 */}
          <SettingCard
            title='다크모드'
            icon={{
              name: isDark ? 'moon' : 'sunny',
              color: isDark ? '#9ca3af' : '#6b7280',
              backgroundColor: isDark ? '#374151' : '#f3f4f6',
            }}>
            <ThemeToggle />
          </SettingCard>
        </View>
      </View>

      {/* 관리자 설정 */}
      {(user?.role === '관리자' || user?.role === '교역자') && (
        <View style={{ marginBottom: 32 }}>
          <SettingSectionHeader color={colors.text}>관리자</SettingSectionHeader>
          <View style={{ gap: 12 }}>
            {/* 공지사항 관리 */}
            <SettingCard
              title='공지사항 관리'
              icon={{
                name: 'megaphone-outline',
                color: '#10b981',
                backgroundColor: '#d1fae5',
              }}
              onPress={() => router.push('/myPage/noticeManager')}
            />
            <SettingCard
              title='유튜브 영상 관리'
              icon={{
                name: 'videocam-outline',
                color: '#ef4444',
                backgroundColor: '#fee2e2',
              }}
              onPress={() => router.push('/myPage/videoManager')}
            />
          </View>
        </View>
      )}

      <View style={{ gap: 12 }}>
        <SettingCard
          title='피드백 보내기'
          icon={{
            name: 'chatbox-outline',
            color: '#7c3aed',
            backgroundColor: '#ddd6fe',
          }}
          onPress={() => router.push('/myPage/feedback')}
        />
      </View>
    </MyScreenContainer>
  );
}

type SettingSectionHeaderProps = {
  color: string;
};

const SettingSectionHeader = styled.Text<SettingSectionHeaderProps>`
  font-size: 18px;
  font-weight: 600;
  color: ${({ color }: SettingSectionHeaderProps) => color};
  margin-bottom: 16px;
  padding-left: 4px;
`;
