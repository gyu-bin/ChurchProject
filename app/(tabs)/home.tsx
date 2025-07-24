import ActiveSection from '@/app/home/active';
import BannerCarousel from '@/app/home/homeBanner';
import HomeNews from '@/app/home/homeNews';
import HomeNotices from '@/app/home/noticePage';
import TodayBible from '@/app/home/todayBible';
import PromoModal from '@/app/PromoModal';
import { verses } from '@/assets/verses';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { useBanners, useEvents } from '@/hooks/useEvents';
import { useNotifications } from '@/hooks/useNotifications';
import { usePrayers } from '@/hooks/usePrayers';
import { useAppDispatch } from '@/hooks/useRedux';
import { setScrollCallback } from '@/utils/scrollRefManager';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DefaultTheme } from 'styled-components';
import styled from 'styled-components/native';

type Prayer = {
  id: string;
  title: string;
  content: string;
  name: string;
  visibility: 'all' | 'pastor';
  createdAt?: {
    toDate: () => Date;
  };
};

// 일정(이벤트) 타입 명시
interface EventNotice {
  id: string;
  title: string;
  content?: string;
  place?: string;
  time?: string;
  startDate?: { seconds: number };
  endDate?: { seconds: number };
  bannerImage?: string;
  banner?: string;
  type: 'banner';
}

// Define the theme interface
interface Theme {
  colors: {
    background: string;
    primary: string;
    surface: string;
    text: string;
  };
  radius: {
    lg: number;
  };
  spacing: {
    md: number;
  };
}

// Styled components
const SafeArea = styled.SafeAreaView<DefaultTheme>`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const HeaderView = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const LogoContainer = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  overflow: hidden;
  background-color: #fff;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
`;

const LogoText = styled.Text`
  font-size: 30px;
  font-weight: 700;
  color: #4cc9f0;
  margin-left: 12px;
  letter-spacing: 1px;
  text-shadow-color: rgba(76, 201, 240, 0.3);
  text-shadow-offset: 0px 2px;
  text-shadow-radius: 4px;
`;

const NotificationBadge = styled.View<DefaultTheme>`
  position: absolute;
  top: -6px;
  right: -6px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  border-radius: 12px;
  min-width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding-horizontal: 4px;
`;

const QuickMenuContainer = styled.View`
  flex-direction: row;
  justify-content: space-around;
  margin-vertical: 15px;
`;

const QuickMenuButtonContainer = styled.View`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: #f5f6fa;
  justify-content: center;
  align-items: center;
  margin-bottom: 6px;
  shadow-color: #000;
  shadow-opacity: 0.06;
  shadow-radius: 4px;
  elevation: 2;
`;

const QuickMenuLabel = styled.Text<DefaultTheme>`
  color: ${({ theme }: { theme: Theme }) => theme.colors.text};
  font-size: 15px;
  font-weight: 500;
`;

// Additional styled components
const ListHeaderContainer = styled.View<DefaultTheme>`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing.md}px;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing.md}px;
`;

const RowContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const NotificationButton = styled(TouchableOpacity)`
  position: relative;
`;

const StyledImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const StyledText = styled.Text`
  color: #fff;
  font-size: 12px;
  font-weight: bold;
`;

const StyledView = styled.View<DefaultTheme>`
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radius.lg}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing.md}px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.08;
  shadow-radius: 6px;
  //elevation: 3;
`;

export default function HomeScreen() {
  const router = useRouter();
  const { mode } = useAppTheme();
  const theme = useDesign();
  const insets = useSafeAreaInsets();
  const [verse, setVerse] = useState(verses[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const dispatch = useAppDispatch();

  const mainListRef = useRef<FlatList>(null);

  // TanStack Query 훅 사용
  const {
    data: prayers = [],
    isLoading: prayersLoading,
    refetch: refetchPrayers,
  } = usePrayers('all');
  const { data: banners = [], isLoading: bannersLoading } = useBanners();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications(
    currentUser?.email || ''
  );
  const [quickModal, setQuickModal] = useState<null | 'verse' | 'calendar' | 'catechism' | 'ai'>(
    null
  );

  // 달력 마킹용
  const [calendarVisible, setCalendarVisible] = useState(false);

  const frame = useSafeAreaFrame();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setScrollCallback('home', () => {
      mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const raw = await AsyncStorage.getItem('currentUser');
      if (raw) {
        const userData = JSON.parse(raw);
        setCurrentUser(userData);
      }
    };
    loadUser();
  }, []);

  // TanStack Query 데이터로 마킹 데이터 생성
  const markedDates = useMemo(() => {
    const marks: any = {};

    // banners 데이터로 마킹 생성
    banners.forEach((ev) => {
      const start = ev.startDate?.seconds ? new Date(ev.startDate.seconds * 1000) : null;
      const end = ev.endDate?.seconds ? new Date(ev.endDate.seconds * 1000) : start;
      if (start) {
        let d = new Date(start);
        while (d <= (end || start)) {
          const key = d.toISOString().split('T')[0];
          marks[key] = marks[key] || { marked: true, dots: [{ color: '#2563eb' }] };
          d.setDate(d.getDate() + 1);
        }
      }
    });

    // events 데이터로 마킹 생성
    events.forEach((ev) => {
      const start = ev.startDate?.seconds ? new Date(ev.startDate.seconds * 1000) : null;
      const end = ev.endDate?.seconds ? new Date(ev.endDate.seconds * 1000) : start;
      if (start) {
        let d = new Date(start);
        while (d <= (end || start)) {
          const key = d.toISOString().split('T')[0];
          marks[key] = marks[key] || { marked: true, dots: [{ color: '#2563eb' }] };
          d.setDate(d.getDate() + 1);
        }
      }
    });

    return marks;
  }, [banners, events]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setVerse(verses[Math.floor(Math.random() * verses.length)]);
    await refetchPrayers();
    setRefreshing(false);
  }, [refetchPrayers]);

  const goToEvent = (id: string) => {
    router.push({
      pathname: '/home/BannerDetail/event',
      params: { id },
    });
  };

  return (
    <Suspense fallback={<Text style={{ textAlign: 'center', marginTop: 40 }}>로딩 중...</Text>}>
      <SafeArea style={{ paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <FlatList
          ref={mainListRef}
          ListHeaderComponent={
            <ListHeaderContainer>
              <HeaderView>
                <RowContainer>
                  <LogoContainer>
                    <StyledImage source={require('@/assets/logoVer1.png')} resizeMode='cover' />
                  </LogoContainer>
                  <LogoText>Xion</LogoText>
                </RowContainer>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                  }}>
                  {/* 📅 캘린더 버튼 */}
                  <TouchableOpacity
                    onPress={() => router.push('/home/QuickMenuButton/calendar')}
                    style={{ alignItems: 'center', paddingRight: 10 }}>
                    <AntDesign name='calendar' size={30} color={theme.colors.text} />
                    {/*<QuickMenuLabel>캘린더</QuickMenuLabel>*/}
                  </TouchableOpacity>

                  {/* 🔔 알림 버튼 */}
                  <NotificationButton onPress={() => router.push('/home/notifications')}>
                    <Ionicons name='notifications-outline' size={24} color={theme.colors.text} />
                    {notifications.length > 0 && (
                      <NotificationBadge>
                        <StyledText>{notifications.length}</StyledText>
                      </NotificationBadge>
                    )}
                  </NotificationButton>
                </View>
              </HeaderView>

              {/*공지 & 일정*/}
              <StyledView>
                <HomeNotices />
              </StyledView>

              {/* 상단배너*/}
              <BannerCarousel events={banners} goToEvent={goToEvent} theme={theme} />

              {/* 퀵메뉴 */}
              <QuickMenuContainer>
                {[
                  {
                    icon: <Text style={{ fontSize: 30 }}>💕</Text>,
                    label: '오늘의 말씀',
                    action: () => startTransition(() => router.push('../home/QuickMenuButton/todayVerse')),
                  },
                  {
                    icon: <Text style={{ fontSize: 30 }}>📰</Text>,
                    label: '주보',
                    action: () => startTransition(() => router.push('../home/QuickMenuButton/BulletinListPage')),
                  },
                  {
                    icon: <Text style={{ fontSize: 30 }}>📖</Text>,
                    label: '교리',
                    action: () => startTransition(() => router.push('../home/QuickMenuButton/catechism/')),
                  },
                  {
                    icon: <Text style={{ fontSize: 30 }}>💬</Text>,
                    label: '심방 요청',
                    action: () => startTransition(() => router.push('../home/QuickMenuButton/counseling')),
                  },
                  /*   {
                                icon: <Text style={{ fontSize: 30 }}>📅</Text>,
                                label: '캘린더',
                                action: () => setCalendarVisible(true),
                            }*/
                ].map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={item.action}
                    style={{ alignItems: 'center', width: 72 }}>
                    <QuickMenuButtonContainer>{item.icon}</QuickMenuButtonContainer>
                    <QuickMenuLabel>{item.label}</QuickMenuLabel>
                  </TouchableOpacity>
                ))}
              </QuickMenuContainer>

              <StyledView>
                <HomeNews />
              </StyledView>

              {/*반짝 & 기도*/}
              <StyledView>
                <ActiveSection />
              </StyledView>

              <StyledView>
                <TodayBible />
              </StyledView>
            </ListHeaderContainer>
          }
          data={prayers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={() => <View />}
        />
        {/* 오늘의 말씀 모달 */}
        <Modal
          visible={quickModal === 'verse'}
          transparent
          animationType='fade'
          onRequestClose={() => setQuickModal(null)}>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setQuickModal(null)}>
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 20,
                padding: 28,
                minWidth: 260,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 12,
              }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>오늘의 말씀</Text>
              <Text style={{ fontSize: 16, color: '#222', marginBottom: 4 }}>{verse.verse}</Text>
              <Text style={{ fontSize: 14, color: '#888' }}>{verse.reference}</Text>
            </View>
          </Pressable>
        </Modal>

        {/* 교리문답 모달 */}
        {/*<Modal
        visible={quickModal === 'catechism'}
        transparent
        animationType='fade'
        onRequestClose={() => setQuickModal(null)}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setQuickModal(null)}>
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 24,
              minWidth: 280,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 12,
            }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>교리문답</Text>
            {catechismData.slice(0, 3).map((item, idx) => (
              <View key={idx} style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold', color: '#2563eb' }}>{item.question}</Text>
                <Text style={{ color: '#222' }}>{item.answer}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>*/}

        <PromoModal />
      </SafeArea>
    </Suspense>
  );
}
