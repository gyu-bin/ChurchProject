// components/CustomGridCalendar.tsx
import AlarmModal from '@/app/home/calendarDetail/calendarAlarm';
import EventDetailModal from '@/app/home/calendarDetail/calendarDetail';
import CustomDropdown from '@/components/dropDown';
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    PanResponder,
    PanResponderGestureState,
    Platform,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

const campusData = [
  { label: '전체', value: '전체' },
  { label: '문래', value: '문래' },
  { label: '신촌', value: '신촌' },
  { label: '시선교회', value: '시선교회' },
];
const divisionData = [
  { label: '전체', value: '전체' },
  { label: '유치부', value: '문래' },
  { label: '초등부', value: '신촌' },
  { label: '중고등부', value: '시선교회' },
  { label: '청년1부', value: '시선교회' },
  { label: '청년2부', value: '시선교회' },
  { label: '장년부', value: '시선교회' },
];

export default function CalendarPage({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, spacing, font } = useDesign();
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const today = dayjs();
  const [user, setUser] = useState<any>(null);
  const [campusFilter, setCampusFilter] = useState('전체');
  const [divisionFilter, setDivisionFilter] = useState('전체');
  const [viewType, setViewType] = useState<'calendar' | 'list'>('calendar');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const q = query(collection(db, 'notice'), where('type', '==', 'event'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const raw = await AsyncStorage.getItem('currentUser');
      if (!raw) return;
      const cachedUser = JSON.parse(raw);
      const userRef = doc(db, 'users', cachedUser.email);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const fresh = { ...userSnap.data(), email: cachedUser.email };
        setUser(fresh);
        await AsyncStorage.setItem('currentUser', JSON.stringify(fresh));
      }
    };
    fetchUser();
  }, []);

  const numRows = React.useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    let date = startDate.clone();
    let rows = 0;

    while (date.isBefore(endDate) || date.isSame(endDate)) {
      rows++;
      date = date.add(1, 'week');
    }
    return rows; // 4, 5, 6
  }, [currentMonth]);

  const topAreaHeight = insets.top + 60; // SafeArea + 헤더
  const bottomAreaHeight = 90; // 오늘/추가 버튼
  const otherUIHeight = topAreaHeight + bottomAreaHeight + 180; // 필터 등

  const maxCalendarHeight = frame.height - otherUIHeight;
  const dateCellHeight = Math.min(maxCalendarHeight / numRows, 90);

  const itemHeight = 40; // 아이템 하나당 높이(px)
  const maxVisibleItems = 5; // 최대 표시 아이템 수
  const dropdownHeight = Math.min(campusData.length, maxVisibleItems) * itemHeight;

  const handleToday = () => {
    setCurrentMonth(today);
    setSelectedDate(today.format('YYYY-MM-DD'));
  };

  const getDDayLabel = (startDate: any) => {
    const today = dayjs().startOf('day');
    const start = dayjs(startDate?.seconds * 1000).startOf('day');
    const diff = start.diff(today, 'day');

    if (diff === 0) return 'D-Day';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  const getCalendarMatrix = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    let date = startDate.clone();
    const matrix = [];

    while (date.isBefore(endDate) || date.isSame(endDate)) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(date);
        date = date.add(1, 'day');
      }
      matrix.push(week);
    }
    return matrix;
  };

  const isCurrentMonth = (date: any) => {
    return date.month() === currentMonth.month();
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter((ev) => {
      const s = dayjs(ev.startDate?.seconds * 1000).format('YYYY-MM-DD');
      const e = dayjs(ev.endDate?.seconds * 1000).format('YYYY-MM-DD');
      const dateMatch = dateStr >= s && dateStr <= e;

      const campusMatch = campusFilter === '전체' ? true : ev.campus === campusFilter;

      const divisionMatch = divisionFilter === '전체' ? true : ev.division === divisionFilter;

      return dateMatch && campusMatch && divisionMatch;
    });
  };

  const filteredEvents = events.filter((ev) => {
    const campusMatch = campusFilter === '전체' ? true : ev.campus === campusFilter;
    const divisionMatch = divisionFilter === '전체' ? true : ev.division === divisionFilter;
    return campusMatch && divisionMatch;
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20,
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        if (gestureState.dx > 50) {
          setCurrentMonth((prev) => prev.subtract(1, 'month'));
        } else if (gestureState.dx < -50) {
          setCurrentMonth((prev) => prev.add(1, 'month'));
        }
      },
    })
  ).current;

  // 일정 1개 높이와 여백 합계 (예: 20 + 4 = 24)
  const EVENT_ITEM_HEIGHT = 20 + 4;

  const getMaxEventsPerCell = () => {
    // dateCellHeight 안에 들어갈 수 있는 최대 갯수 계산
    const availableHeight = dateCellHeight - 20; // 날짜 숫자, 패딩 여백 제외
    return Math.floor(availableHeight / EVENT_ITEM_HEIGHT);
  };

  const handleOpenAlarm = (event: any) => {
    setSelectedEvent(event);
    setShowAlarmModal(true);
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? insets.top : insets.top,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          position: 'relative', // 타이틀 절대 배치 기준
        }}>
        {/* 뒤로가기 */}
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </TouchableOpacity>

        {/* 타이틀 중앙 고정 */}
        <Text
          style={{
            position: 'absolute', // 절대 위치
            left: '50%', // 화면 가운데
            transform: [{ translateX: -25 }],
            fontSize: font.heading,
            fontWeight: 'bold',
            color: colors.text,
            textAlign: 'center',
          }}>
          시광 캘린더
        </Text>

        {/* 오른쪽 알림내역 */}
        <TouchableOpacity
          style={{
            flexDirection: 'column',
            alignItems: 'center', // 가운데 정렬
            justifyContent: 'center',
          }}
          onPress={() => router.push('/home/calendarDetail/alarmList')}>
          <Feather name='bell' size={24} color='black' />
          <Text style={{ color: colors.text, fontSize: 12 }}>알림내역</Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          borderRadius: 20,
          paddingTop: 10,
          paddingHorizontal: 20,
          width: '100%',
          height: frame.height,
          maxHeight: frame.height,
          display: 'flex',
          flexDirection: 'column',
        }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center', // 🔥 화면 중앙 정렬
            alignItems: 'center',
          }}>
          <TouchableOpacity
            onPress={() => setViewType('calendar')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: viewType === 'calendar' ? colors.primary : colors.border,
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
            }}>
            <Text style={{ color: viewType === 'calendar' ? '#fff' : colors.text }}>📅 달력형</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewType('list')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: viewType === 'list' ? colors.primary : colors.border,
              borderTopRightRadius: 8,
              borderBottomRightRadius: 8,
            }}>
            <Text style={{ color: viewType === 'list' ? '#fff' : colors.text }}>📋 리스트형</Text>
          </TouchableOpacity>
        </View>

        {viewType === 'calendar' ? (
          <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* 상단 월 표기 + 이동 */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: spacing.md,
                alignItems: 'center',
              }}>
              <TouchableOpacity
                onPress={() => setCurrentMonth((prev) => prev.subtract(1, 'month'))}>
                <Ionicons name='chevron-back' size={24} color={colors.text} />
              </TouchableOpacity>

              <Text
                style={{
                  fontSize: font.heading,
                  fontWeight: 'bold',
                  color: colors.text,
                }}>
                {currentMonth.format('YYYY년 M월')}
              </Text>

              <TouchableOpacity onPress={() => setCurrentMonth((prev) => prev.add(1, 'month'))}>
                <Ionicons name='chevron-forward' size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingBottom: 10, flexDirection: 'row' }}>
              <CustomDropdown
                data={campusData}
                value={campusFilter}
                onChange={(item) => setCampusFilter(item.value)}
                containerStyle={{ width: '48%', marginRight: 16 }}
                maxHeight={campusData.length * 84 + 16}
                dropdownPosition='bottom'
              />
              <CustomDropdown
                data={divisionData}
                value={divisionFilter}
                onChange={(item) => setDivisionFilter(item.value)}
                containerStyle={{ width: '48%' }}
                maxHeight={divisionData.length * 84 + 16}
                dropdownPosition='bottom'
              />
            </View>

            {/* 요일 */}
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {daysOfWeek.map((day, idx) => (
                <Text
                  key={idx}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontWeight: '600',
                    color: idx === 0 ? 'red' : idx === 6 ? colors.primary : colors.subtext,
                  }}>
                  {day}
                </Text>
              ))}
            </View>

            {/* 달력 */}
            <View {...panResponder.panHandlers} style={{ flexShrink: 0, maxHeight: '60%' }}>
              {/*<View {...panResponder.panHandlers}>*/}
              {getCalendarMatrix().map((week, i) => (
                <View key={i} style={{ flexDirection: 'row' }}>
                  {week.map((date) => {
                    const dateStr = date.format('YYYY-MM-DD');
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === today.format('YYYY-MM-DD');
                    const dayEvents = getEventsForDate(dateStr);

                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={{
                          flex: 1,
                          borderTopWidth: 1,
                          borderBottomWidth: 1,
                          borderColor: '#c0bebe',
                          borderRadius: 8,
                          backgroundColor: isSelected ? colors.primary : undefined,
                          height: dateCellHeight + 4, // ✅ 유동 높이 적용
                          minHeight: dateCellHeight,
                          opacity: isCurrentMonth(date) ? 1 : 0,
                          pointerEvents: isCurrentMonth(date) ? 'auto' : 'none',
                        }}
                        onPress={() => {
                          if (dayEvents.length > 0) {
                            setSelectedDate(dateStr);
                            setShowEventModal(true);
                          }
                        }}>
                        <Text
                          style={{
                            textAlign: 'center',
                            color: isSelected
                              ? '#fff'
                              : date.day() === 0
                                ? 'red'
                                : date.day() === 6
                                  ? colors.primary
                                  : colors.text,
                            fontWeight: isToday ? 'bold' : 'normal',
                          }}>
                          {date.date()}
                        </Text>

                        <View
                          style={{
                            maxHeight: dateCellHeight - 20, // 날짜 숫자 영역 제외
                            overflow: 'hidden',
                          }}>
                          {dayEvents.slice(0, getMaxEventsPerCell()).map((ev) => (
                            <View
                              key={ev.id}
                              style={{
                                backgroundColor: isSelected
                                  ? '#ffffff33'
                                  : colors.background === 'dark'
                                    ? 'black'
                                    : colors.primary,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                                marginTop: 2,
                                alignSelf: 'center',
                              }}>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: isSelected
                                    ? '#fff'
                                    : colors.background === 'dark'
                                      ? colors.primary
                                      : 'white',
                                  fontWeight: '500',
                                }}
                                numberOfLines={1}>
                                {ev.title}
                              </Text>
                            </View>
                          ))}
                        </View>
                        {/* ✅ 4개 이상이면 "더보기" 표시 */}
                        {dayEvents.length > getMaxEventsPerCell() && (
                          <Text
                            style={{
                              fontSize: 8,
                              color: isSelected ? '#fff' : colors.primary,
                              textAlign: 'center',
                              marginTop: 2,
                            }}>
                            +{dayEvents.length - getMaxEventsPerCell()}개 더보기
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
            {/*</View>*/}

            <EventDetailModal
              visible={showEventModal}
              onClose={() => setShowEventModal(false)}
              date={selectedDate}
              events={getEventsForDate(selectedDate)}
              colors={colors}
            />

            {/* 오늘 및 추가 버튼 */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom, // ⬆️ 버튼 위아래 여백
                paddingHorizontal: 10,
                marginTop: 'auto', // ⬆️ 최하단으로 밀어냄
                // backgroundColor: 'pink', // 배경 일체화
                backgroundColor: colors.background, // 배경 일체화
              }}>
              {/* ✅ 추가 버튼 (권한 체크) */}
              {(user?.role === '관리자' || user?.role === '교역자' || user?.role === '임원') && (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    padding: 14,
                    borderRadius: 28,
                    marginRight: 10,
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                  }}>
                  <Ionicons name='add' size={24} color='#fff' />
                </TouchableOpacity>
              )}

              {/* ✅ 오늘 버튼 (모두 표시) */}
              <TouchableOpacity
                onPress={handleToday}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 10,
                  paddingHorizontal: 15,
                  borderRadius: 30,
                  justifyContent: 'center',
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>오늘</Text>
              </TouchableOpacity>
            </View>
            {/*</View>*/}
          </View>
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* 필터 */}
            <View
              style={{
                flexDirection: 'row',
                marginBottom: 8,
                paddingHorizontal: 8,
                paddingTop: 8,
                // overflow: 'hidden',
              }}>
              {/* campusFilter */}
              <CustomDropdown
                data={campusData}
                value={campusFilter}
                maxHeight={campusData.length * 84 + 16}
                onChange={(item) => setCampusFilter(item.value)}
                containerStyle={{ width: '48%', marginRight: 16 }}
                dropdownPosition='bottom'
              />

              {/* divisionFilter */}
              <CustomDropdown
                data={divisionData}
                value={divisionFilter}
                onChange={(item) => setDivisionFilter(item.value)}
                containerStyle={{ width: '48%', marginRight: 16 }}
                maxHeight={divisionData.length * 84 + 16}
                dropdownPosition='bottom'
              />
            </View>

            {/* FlatList 전체 영역 */}
            <SafeAreaView style={{ flex: 1 }}>
              <FlatList
                data={filteredEvents}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  paddingHorizontal: 8,
                  paddingBottom: 120,
                }}
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                style={{ flex: 1 }}
                removeClippedSubviews={false}
                onTouchStart={() => {}}
                onTouchEnd={() => {}}
                keyboardShouldPersistTaps='handled'
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 1,
                    }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: colors.text,
                          marginBottom: 6,
                        }}>
                        {item.title}
                      </Text>

                      <TouchableOpacity onPress={() => handleOpenAlarm(item)}>
                        <Text style={{ fontSize: 12, color: colors.primary }}>🔔알림받기</Text>
                      </TouchableOpacity>
                    </View>

                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.subtext,
                        marginBottom: 4,
                      }}>
                      📅 {dayjs(item.startDate?.seconds * 1000).format('YYYY.MM.DD')} ~{' '}
                      {dayjs(item.endDate?.seconds * 1000).format('MM.DD')}
                      <Text style={{ fontSize: 13, color: colors.primary }}>
                        ({getDDayLabel(item.startDate)})
                      </Text>
                    </Text>

                    {item.place && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.subtext,
                          marginBottom: 4,
                        }}>
                        📍 장소: {item.place}
                      </Text>
                    )}

                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}>
                      {item.campus && (
                        <View
                          style={{
                            backgroundColor: '#E3F2FD',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                            marginRight: 6,
                          }}>
                          <Text style={{ fontSize: 12, color: '#1976D2' }}>
                            캠퍼스: {item.campus}
                          </Text>
                        </View>
                      )}
                      {item.division && (
                        <View
                          style={{
                            backgroundColor: '#F3E5F5',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                          }}>
                          <Text style={{ fontSize: 12, color: '#6A1B9A' }}>
                            부서: {item.division}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </SafeAreaView>
          </View>
        )}
      </View>
      {selectedEvent && (
        <AlarmModal
          visible={showAlarmModal}
          onClose={() => setShowAlarmModal(false)}
          eventTitle={selectedEvent.title}
          eventDate={new Date(selectedEvent.startDate?.seconds * 1000)}
        />
      )}
    </SafeAreaView>
  );
}
