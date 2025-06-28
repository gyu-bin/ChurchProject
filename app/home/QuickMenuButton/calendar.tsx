// components/CustomGridCalendar.tsx
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import dayjs from 'dayjs';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Modal, PanResponder, PanResponderGestureState,
    Platform, Pressable, SafeAreaView, ScrollView, Text,
    TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';
import { Dropdown } from 'react-native-element-dropdown';
import EventDetailModal from "@/app/home/calendarDetail/calendarDetail";


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
    const [showEventModal, setShowEventModal] = useState(false);
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

    const isCurrentMonth = (date:any) => {
        return date.month() === currentMonth.month();
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
        pointerEvents="box-none"
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            paddingTop: 20,
            paddingHorizontal: 20,
            width: '100%',
            height: '100%',
            maxHeight: '95%',
            display: 'flex',
            flexDirection: 'column'
          }}
          onPress={() => {}}
          pointerEvents="box-none"
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flex: 1 }}></View>
                <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'center' }}>
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
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {viewType === 'calendar' ? (
                <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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

                    <View style={{paddingBottom: 10, flexDirection: 'row'}}>
                        <Dropdown
                            style={{
                                width: '48%',
                                height: 40,
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
                                height: 40,
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
                            <Text key={idx} style={{
                                flex: 1,
                                textAlign: 'center',
                                fontWeight: '600',
                                color: idx === 0 ? 'red' : idx === 6 ? 'blue' : colors.subtext
                            }}>
                                {day}
                            </Text>
                        ))}
                    </View>

                    {/* 달력 */}
                    {/*<View style={{ flex: 1 }}>*/}
                        {/* 달력 고정 영역 */}
                        <View {...panResponder.panHandlers} style={{flexShrink:0, maxHeight: '60%' }}>
                          {/*<View {...panResponder.panHandlers}>*/}
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
                                                    borderTopWidth: 1,
                                                    borderBottomWidth: 1,
                                                    borderColor: '#eee',
                                                    borderRadius: 8,
                                                    backgroundColor: isSelected ? colors.primary : undefined,
                                                    height: 90,
                                                    opacity: isCurrentMonth(date) ? 1 : 0,
                                                    pointerEvents: isCurrentMonth(date) ? 'auto' : 'none',
                                                }}
                                                onPress={() => {
                                                    setSelectedDate(dateStr);
                                                    setShowEventModal(true);
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        textAlign: 'center',
                                                        color: isSelected
                                                            ? '#fff'
                                                            : date.day() === 0
                                                                ? 'red'
                                                                : date.day() === 6
                                                                    ? 'blue'
                                                                    : colors.text,
                                                        fontWeight: isToday ? 'bold' : 'normal',
                                                    }}
                                                >
                                                    {date.date()}
                                                </Text>

                                                {dayEvents.slice(0, 4).map(ev => (
                                                    <View
                                                        key={ev.id}
                                                        style={{
                                                            backgroundColor: isSelected
                                                                ? '#ffffff33'
                                                                : colors.background === 'dark'
                                                                    ? 'black' // 다크모드용 배경
                                                                    : 'white', // 라이트모드 배경
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
                                                                color: isSelected
                                                                    ? '#fff'
                                                                    : colors.background === 'dark'
                                                                        ? 'white' // 다크모드 텍스트 색상
                                                                        : 'black',
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
                        {/*</View>*/}

                    <EventDetailModal
                        visible={showEventModal}
                        onClose={() => setShowEventModal(false)}
                        date={selectedDate}
                        events={getEventsForDate(selectedDate)}
                        colors={colors}
                    />

                        {/* ✅ 상세 일정만 ScrollView 적용 */}
                        {/*<View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold', fontSize: font.body, color: colors.primary, marginTop: 20 }}>
                                {selectedDate} 일정
                            </Text>

                             ✅ 최대 3개 정도 보이도록 height 제한
                            <ScrollView
                                style={{ maxHeight: 200 }} // 여기서 높이 조절 (70~75px * 3 + 여백 고려)
                                contentContainerStyle={{ paddingBottom: 16 }}
                                showsVerticalScrollIndicator={true}
                            >
                                {getEventsForDate(selectedDate).length > 0 ? (
                                    getEventsForDate(selectedDate).map(ev => (
                                        <View key={ev.id} style={{ paddingVertical: 6 }}>
                                            <Text style={{ fontWeight: 'bold', color: colors.text }}>{ev.title}</Text>
                                            {ev.place && (
                                                <Text style={{ color: colors.subtext, fontSize: 13 }}>장소: {ev.place}</Text>
                                            )}
                                            {(ev.campus || ev.division) && (
                                                <Text style={{ color: colors.subtext, fontSize: 13 }}>
                                                    {ev.campus ? `캠퍼스: ${ev.campus}` : ''}{' '}
                                                    {ev.division ? `부서: ${ev.division}` : ''}
                                                </Text>
                                            )}
                                        </View>
                                    ))
                                ) : (
                                    <Text style={{ color: colors.subtext, marginTop: 6 }}>일정이 없습니다.</Text>
                                )}
                            </ScrollView>
                        </View>*/}

                    {/* 오늘 및 추가 버튼 */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 12, paddingHorizontal: 16, position: 'absolute', bottom: 0, right: 0, left: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
                        {(user?.role === '관리자' || user?.role === '교역자' || user?.role === '임원') && (
                            <TouchableOpacity style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 20, marginRight: 10 }}>
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={handleToday} style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 20 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>오늘</Text>
                        </TouchableOpacity>
                    </View>
                    {/*</View>*/}
                </View>
            ) : (
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    {/* 필터 */}
                    <View style={{ flexDirection: 'row', marginBottom: 8, gap: 8, paddingHorizontal: 8, paddingTop: 8 }}>
                        {/* campusFilter */}
                        <Dropdown
                            style={{
                                flex: 1,
                                height: 40,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 8,
                                paddingHorizontal: 8,
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

                        {/* divisionFilter */}
                        <Dropdown
                            style={{
                                flex: 1,
                                height: 40,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 8,
                                paddingHorizontal: 8,
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

                    {/* FlatList 전체 영역 */}
                        <SafeAreaView style={{ flex: 1 }}>
                        <FlatList
                            data={filteredEvents}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 120 }}
                            showsVerticalScrollIndicator={true}
                                scrollEnabled={true}
                                nestedScrollEnabled={true}
                                style={{ flex: 1 }}
                                removeClippedSubviews={false}
                                onTouchStart={() => {}}
                                onTouchEnd={() => {}}
                                keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                             <TouchableOpacity
                                    activeOpacity={0.8}
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
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
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
                                </TouchableOpacity>
                            )}
                        />
                    </SafeAreaView>
                </View>
            )}
        </Pressable>
      </Pressable>
    </Modal>
      );
}
