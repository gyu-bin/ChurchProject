// components/CustomGridCalendar.tsx
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import dayjs from 'dayjs';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Modal, PanResponder, PanResponderGestureState,
    Platform, Pressable, ScrollView, Text,
    TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';
import { Dropdown } from 'react-native-element-dropdown';


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
]

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
    const [campusFilter, setCampusFilter] = useState('전체');
    const [divisionFilter, setDivisionFilter] = useState('전체');
    const [viewType, setViewType] = useState<'calendar' | 'list'>('calendar');

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
            const dateMatch = dateStr >= s && dateStr <= e;

            const campusMatch = campusFilter === '전체' || ev.campus === campusFilter;
            const divisionMatch = divisionFilter === '전체' || ev.division === divisionFilter;

            return dateMatch && campusMatch && divisionMatch;
        });
    };

    const filteredEvents = events.filter(ev => {
        const campusMatch =
            !campusFilter || campusFilter === '전체' || ev.campus === campusFilter;
        const divisionMatch =
            !divisionFilter || divisionFilter === '전체' || ev.division === divisionFilter;
        return campusMatch && divisionMatch;
    });

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
                Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20,
            onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
                if (gestureState.dx > 50) {
                    setCurrentMonth(prev => prev.subtract(1, 'month'));
                } else if (gestureState.dx < -50) {
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
              height: 'auto',
            minHeight: 600,
            maxHeight: 800,
          }}
          onPress={() => {}}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
                <TouchableOpacity
                    onPress={() => setViewType('calendar')}
                    style={{
                        padding: 10,
                        backgroundColor: viewType === 'calendar' ? colors.primary : colors.border,
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8,
                    }}
                >
                    <Text style={{ color: viewType === 'calendar' ? '#fff' : colors.text }}>📅 달력형</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setViewType('list')}
                    style={{
                        padding: 10,
                        backgroundColor: viewType === 'list' ? colors.primary : colors.border,
                        borderTopRightRadius: 8,
                        borderBottomRightRadius: 8,
                    }}
                >
                    <Text style={{ color: viewType === 'list' ? '#fff' : colors.text }}>📋 리스트형</Text>
                </TouchableOpacity>
            </View>

            {viewType === 'calendar' ? (
                <View>
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

                    <View style={{padding: 16, flexDirection: 'row'}}>
                        <Dropdown
                            style={{
                                width: '48%',
                                height: 50,
                                borderColor: '#FFA726',
                                borderWidth: 1,
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                backgroundColor: '#fff',
                                marginRight: 16,
                            }}
                            placeholderStyle={{
                                fontSize: 15,
                                color: '#999',
                            }}
                            selectedTextStyle={{
                                fontSize: 15,
                                color: '#333',
                            }}
                            itemTextStyle={{
                                fontSize: 14,
                                paddingVertical: 10,
                            }}
                            data={campusData}
                            maxHeight={200}
                            labelField="label"
                            valueField="value"
                            placeholder="캠퍼스 선택"
                            value={campusFilter}
                            onChange={item => {
                                setCampusFilter(item.value);
                            }}
                        />

                        <Dropdown
                            style={{
                                width: '48%',
                                height: 50,
                                borderColor: '#FFA726',
                                borderWidth: 1,
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                backgroundColor: '#fff',
                                marginRight: 16,
                            }}
                            placeholderStyle={{
                                fontSize: 15,
                                color: '#999',
                            }}
                            selectedTextStyle={{
                                fontSize: 15,
                                color: '#333',
                            }}
                            itemTextStyle={{
                                fontSize: 14,
                                paddingVertical: 10,
                            }}
                            data={divisionData}
                            maxHeight={200}
                            labelField="label"
                            valueField="value"
                            placeholder="부서 선택"
                            value={divisionFilter}
                            onChange={item => {
                                setDivisionFilter(item.value);
                            }}
                        />
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

                                            {dayEvents.slice(0, 10).map(ev => (
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

                </View>
            ) : (
                <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
                    {/* ✅ 드롭다운 필터 */}
                    <View style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
                        <Dropdown
                            style={{
                                flex: 1,
                                height: 48,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                backgroundColor: '#fff',
                            }}
                            placeholderStyle={{ fontSize: 14, color: '#888' }}
                            selectedTextStyle={{ fontSize: 14, color: '#000' }}
                            data={campusData}
                            labelField="label"
                            valueField="value"
                            placeholder="캠퍼스"
                            value={campusFilter}
                            onChange={item => setCampusFilter(item.value)}
                        />
                        <Dropdown
                            style={{
                                flex: 1,
                                height: 48,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                backgroundColor: '#fff',
                            }}
                            placeholderStyle={{ fontSize: 14, color: '#888' }}
                            selectedTextStyle={{ fontSize: 14, color: '#000' }}
                            data={divisionData}
                            labelField="label"
                            valueField="value"
                            placeholder="부서"
                            value={divisionFilter}
                            onChange={item => setDivisionFilter(item.value)}
                        />
                    </View>

                <FlatList
                    data={filteredEvents}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                    renderItem={({ item }) => (
                        <View
                            style={{
                                backgroundColor: colors.surface,
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 12,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 1,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: '600',
                                    color: colors.text,
                                    marginBottom: 6,
                                }}
                            >
                                {item.title}
                            </Text>

                            <Text style={{ fontSize: 13, color: colors.subtext, marginBottom: 4 }}>
                                📅 {dayjs(item.startDate?.seconds * 1000).format('YYYY.MM.DD')} ~{' '}
                                {dayjs(item.endDate?.seconds * 1000).format('MM.DD')}
                            </Text>

                            {item.place && (
                                <Text style={{ fontSize: 13, color: colors.subtext, marginBottom: 4 }}>
                                    📍 장소: {item.place}
                                </Text>
                            )}

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {item.campus && (
                                    <View
                                        style={{
                                            backgroundColor: '#E3F2FD',
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 8,
                                            marginRight: 6,
                                        }}
                                    >
                                        <Text style={{ fontSize: 12, color: '#1976D2' }}>캠퍼스: {item.campus}</Text>
                                    </View>
                                )}
                                {item.division && (
                                    <View
                                        style={{
                                            backgroundColor: '#F3E5F5',
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 8,
                                        }}
                                    >
                                        <Text style={{ fontSize: 12, color: '#6A1B9A' }}>부서: {item.division}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                />
                </View>
            )}

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
                    {(ev.campus || ev.division) && (
                        <Text style={{ color: colors.subtext, fontSize: 13 }}>
                            {ev.campus ? `캠퍼스: ${ev.campus}` : ''}{' '}
                            {ev.division ? `부서: ${ev.division}` : ''}
                        </Text>
                    )}
                </View>
              ))
            ) : (
              <Text style={{ color: colors.subtext, marginTop: spacing.sm }}>일정이 없습니다.</Text>
            )}
          </View>

                    {/* 오늘 및 추가 버튼 */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, marginBottom: 20 }}>
                        {(user?.role === '관리자' || user?.role === '교역자' || user?.role === '임원') && (
                            <TouchableOpacity style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 20, marginRight: 10 }}>
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={handleToday} style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 20 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>오늘</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
