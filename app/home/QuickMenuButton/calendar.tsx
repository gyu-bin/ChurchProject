// components/CustomGridCalendar.tsx
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import dayjs from 'dayjs';
import {collection, doc, onSnapshot, query, where} from 'firebase/firestore';
import React, {useEffect, useRef, useState} from 'react';
import {
    Modal, PanResponder, PanResponderGestureState,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {Ionicons} from "@expo/vector-icons";

const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, spacing, font } = useDesign();
  const [events, setEvents] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const today = dayjs();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        let unsubscribe: () => void;

        const listenUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (!raw) return;
            const cachedUser = JSON.parse(raw);
            const userRef = doc(db, 'users', cachedUser.email);

            unsubscribe = onSnapshot(userRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const fresh = { ...docSnap.data(), email: cachedUser.email };
                    setUser(fresh); // ✅ 실시간 업데이트
                    await AsyncStorage.setItem('currentUser', JSON.stringify(fresh));
                }
            });
        };

        listenUser();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

  useEffect(() => {
    const q = query(collection(db, 'notice'), where('type', '==', 'event'));
    const unsub = onSnapshot(q, snapshot => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(list);
    });
    return () => unsub();
  }, []);

  const handleToday = () => {
    setCurrentMonth(today);
    setSelectedDate(today.format('YYYY-MM-DD'));
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

  const getEventsForDate = (dateStr: string) => {
    return events.filter(ev => {
      const s = dayjs(ev.startDate?.seconds * 1000).format('YYYY-MM-DD');
      const e = dayjs(ev.endDate?.seconds * 1000).format('YYYY-MM-DD');
      return dateStr >= s && dateStr <= e;
    });
  };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
                Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20,
            onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
                if (gestureState.dx > 50) {
                    // 👉 오른쪽 스와이프 → 이전 달
                    setCurrentMonth(prev => prev.subtract(1, 'month'));
                } else if (gestureState.dx < -50) {
                    // 👈 왼쪽 스와이프 → 다음 달
                    setCurrentMonth(prev => prev.add(1, 'month'));
                }
            },
        })
    ).current;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: Platform.OS === 'android' ? 40 : 80,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            paddingTop: 20,
            paddingHorizontal: 20,
            width: '100%',
            minHeight: 600,
            maxHeight: 700,
          }}
          onPress={() => {}}
        >
          {/* 상단 월 표기 + 이동 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setCurrentMonth(prev => prev.subtract(1, 'month'))}>
              <Text style={{ fontSize: 24, color: colors.primary }}>{'◀'}</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>
              {currentMonth.format('YYYY년 M월')}
            </Text>

            <TouchableOpacity onPress={() => setCurrentMonth(prev => prev.add(1, 'month'))}>
              <Text style={{ fontSize: 24, color: colors.primary }}>{'▶'}</Text>
            </TouchableOpacity>
          </View>

          {/* 요일 */}
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {daysOfWeek.map((day, idx) => (
              <Text key={idx} style={{ flex: 1, textAlign: 'center', fontWeight: '600', color: colors.subtext }}>
                {day}
              </Text>
            ))}
          </View>

          {/* 달력 */}
            <View style={{ maxHeight: 360 }} {...panResponder.panHandlers}>
                {getCalendarMatrix().map((week, i) => (
                    <View key={i} style={{ flexDirection: 'row' }}>
                        {week.map(date => {
                            const dateStr = date.format('YYYY-MM-DD');
                            const isSelected = dateStr === selectedDate;
                            const isToday = dateStr === today.format('YYYY-MM-DD');
                            const dayEvents = getEventsForDate(dateStr);

                            return (
                                <TouchableOpacity
                                    key={dateStr}
                                    style={{
                                        flex: 1,
                                        borderWidth: 0.5,
                                        borderColor: '#eee',
                                        borderRadius: 8,
                                        backgroundColor: isSelected ? colors.primary : undefined,
                                        minHeight: 70,
                                    }}
                                    onPress={() => setSelectedDate(dateStr)}
                                >
                                    <Text
                                        style={{
                                            textAlign: 'center',
                                            color: isSelected ? '#fff' : colors.text,
                                            fontWeight: isToday ? 'bold' : 'normal',
                                        }}
                                    >
                                        {date.date()}
                                    </Text>

                                    {dayEvents.slice(0, 2).map(ev => (
                                        <View
                                            key={ev.id}
                                            style={{
                                                backgroundColor: isSelected ? '#ffffff33' : '#eee',
                                                paddingHorizontal: 6,
                                                paddingVertical: 2,
                                                borderRadius: 6,
                                                marginTop: 4,
                                                alignSelf: 'center',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: isSelected ? '#fff' : colors.text,
                                                    fontWeight: '500',
                                                }}
                                                numberOfLines={1}
                                            >
                                                {ev.title}
                                            </Text>
                                        </View>
                                    ))}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>

          {/* 상세 일정 */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={{ fontWeight: 'bold', fontSize: font.body, color: colors.primary }}>
              {selectedDate} 일정
            </Text>
            {getEventsForDate(selectedDate).length > 0 ? (
              getEventsForDate(selectedDate).map(ev => (
                <View key={ev.id} style={{ paddingVertical: 6 }}>
                  <Text style={{ fontWeight: 'bold', color: colors.text }}>{ev.title}</Text>
                  {ev.place && <Text style={{ color: colors.subtext, fontSize: 13 }}>장소: {ev.place}</Text>}
                </View>
              ))
            ) : (
              <Text style={{ color: colors.subtext, marginTop: spacing.sm }}>일정이 없습니다.</Text>
            )}
          </View>

          {/* 우측 하단 오늘 버튼 */}
            <View style={{ position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center' }}>
                {/* 일정 추가 버튼 - 관리자/임원/교역자만 */}
                {(user?.role === '관리자' || user?.role === '교역자' || user?.role === '임원') && (
                    <TouchableOpacity
                        // onPress={() => setModalVisible(true)}
                        style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            marginRight: 12,
                            shadowColor: '#000',
                            shadowOpacity: 0.2,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 4,
                        }}
                    >
                        <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                )}

                {/* 오늘 버튼 */}
                <TouchableOpacity
                    onPress={handleToday}
                    style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        shadowColor: '#000',
                        shadowOpacity: 0.2,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 4,
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>오늘</Text>
                </TouchableOpacity>
            </View>
        </Pressable>
      </Pressable>


    </Modal>
  );
}
