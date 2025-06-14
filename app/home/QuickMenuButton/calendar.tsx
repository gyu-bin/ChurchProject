// app/components/CalendarModal.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { collection, onSnapshot, query, where, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/app/context/DesignSystem';

interface EventItem {
    id: string;
    title: string;
    place?: string;
    startDate?: { seconds: number };
    endDate?: { seconds: number };
}

export default function CalendarModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { colors, spacing } = useDesign();
    const [markedDates, setMarkedDates] = useState<any>({});
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [events, setEvents] = useState<EventItem[]>([]);
    const [selectedEvents, setSelectedEvents] = useState<EventItem[]>([]);
    const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [calendarKey, setCalendarKey] = useState<number>(Date.now());

    useEffect(() => {
        const q = query(collection(db, 'notice'), where('type', '==', 'event'));
        const unsub = onSnapshot(q, (snapshot) => {
            const eventList: EventItem[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<EventItem, 'id'>),
            }));
            setEvents(eventList);

            const marks: any = {};
            eventList.forEach(ev => {
                const start = ev.startDate?.seconds ? new Date(ev.startDate.seconds * 1000) : null;
                const end = ev.endDate?.seconds ? new Date(ev.endDate.seconds * 1000) : start;
                if (!start) return;
                const current = new Date(start);
                while (current <= (end || start)) {
                    const dateStr = current.toISOString().split('T')[0];
                    if (!marks[dateStr]) marks[dateStr] = { marked: true, dots: [{ color: colors.primary }] };
                    current.setDate(current.getDate() + 1);
                }
            });
            setMarkedDates(marks);
        });
        return () => unsub();
    }, [colors.primary]);

    const handleDayPress = (day: any) => {
        const dateStr = day.dateString;
        setSelectedDate(dateStr);
        const filtered = events.filter(ev => {
            const start = ev.startDate?.seconds ? new Date(ev.startDate.seconds * 1000) : null;
            const end = ev.endDate?.seconds ? new Date(ev.endDate.seconds * 1000) : start;
            if (!start) return false;
            const s = start.toISOString().split('T')[0];
            const e:any = end?.toISOString().split('T')[0];
            return dateStr >= s && dateStr <= e;
        });
        setSelectedEvents(filtered);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }} onPress={onClose}>
                <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding:24, width: '90%', maxWidth: 500 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>시광 캘린더</Text>
                        <TouchableOpacity
                            onPress={() => {
                                const todayStr = new Date().toISOString().split('T')[0];
                                setCurrentDate(todayStr); // 이동 날짜 상태 갱신
                                setSelectedDate(todayStr); // 하단 일정 표시
                                handleDayPress({ dateString: todayStr }); // 필터링
                                setCalendarKey(Date.now()); // ✅ Calendar 강제 리렌더링
                            }}
                            style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                        >
                            <Text style={{ color: '#fff' }}>오늘</Text>
                        </TouchableOpacity>
                    </View>
                    <Calendar
                        style={{ borderRadius: 12, alignSelf: 'stretch' }}
                        theme={{
                            calendarBackground: colors.surface,
                            textSectionTitleColor: colors.subtext,
                            selectedDayBackgroundColor: colors.primary,
                            selectedDayTextColor: '#fff',
                            todayTextColor: colors.primary,
                            dayTextColor: colors.text,
                            textDisabledColor: '#ccc',
                            arrowColor: colors.primary,
                            monthTextColor: colors.primary,
                        }}
                        markedDates={{
                            ...markedDates,
                            [selectedDate]: {
                                ...markedDates[selectedDate],
                                selected: true,
                                selectedColor: colors.primary,
                                selectedTextColor: '#fff',
                            },
                        }}
                        markingType="multi-dot"
                        onDayPress={handleDayPress}
                        current={currentDate}
                        key={calendarKey}
                    />
                    {selectedDate && (
                        <View style={{ marginTop: 16 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 10 }}>{selectedDate} 일정</Text>
                            {selectedEvents.length > 0 ? selectedEvents.map(ev => (
                                <View key={ev.id} style={{ marginBottom: 10 }}>
                                    <Text style={{ fontWeight: 'bold', color: colors.text }}>{ev.title}</Text>
                                    {ev.place && <Text style={{ color: colors.subtext }}>장소: {ev.place}</Text>}
                                </View>
                            )) : <Text style={{ color: colors.subtext }}>일정이 없습니다.</Text>}
                        </View>
                    )}
                </View>
            </Pressable>
        </Modal>
    );
}
