import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import { addDoc, collection, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { db } from '@/firebase/config';

interface AlarmModalProps {
    visible: boolean;
    onClose: () => void;
    eventTitle: string;
    eventDate: Date;
}

export default function AlarmModal({ visible, onClose, eventTitle, eventDate }: AlarmModalProps) {
    const [selectedOffset, setSelectedOffset] = useState<number>(0);
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
    const [selectedTime, setSelectedTime] = useState<Date>(() => {
        const defaultTime = new Date();
        defaultTime.setHours(9, 0, 0, 0);
        return defaultTime;
    });
    const [alarmList, setAlarmList] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<{ uid: string; name: string; email: string; role: string } | null>(null);

    const isDark = useColorScheme() === 'dark';
    const textColor = isDark ? '#fff' : '#000';
    const bgColor = isDark ? '#1f2937' : '#fff';

    useEffect(() => {
        AsyncStorage.getItem('currentUser').then((raw) => {
            if (raw) {
                const user = JSON.parse(raw);
                setCurrentUser(user);
            }
        });

        const unsubscribe = onSnapshot(collection(db, 'alarms'), (snapshot) => {
            const alarms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setAlarmList(alarms);
        });

        return () => unsubscribe();
    }, []);

    const handleScheduleNotification = async () => {
        if (!currentUser) {
            Alert.alert('⛔ 사용자 정보 없음', '로그인이 필요합니다.');
            return;
        }

        const notifyDate = new Date(eventDate);
        notifyDate.setDate(notifyDate.getDate() + selectedOffset);
        notifyDate.setHours(selectedTime.getHours());
        notifyDate.setMinutes(selectedTime.getMinutes());
        notifyDate.setSeconds(0);
        notifyDate.setMilliseconds(0);

        if (notifyDate <= new Date()) {
            Alert.alert('⏰ 알림 예약 실패', '미래 시간을 선택해주세요.');
            return;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📌 일정 알림',
                body: `${eventTitle} 일정이 곧 시작됩니다.`,
                sound: 'default',
            },
            // @ts-ignore
            trigger: notifyDate,
        });

        await addDoc(collection(db, 'alarms'), {
            userId: currentUser.uid || currentUser.email,
            title: eventTitle,
            date: notifyDate,
        });

        Alert.alert('✅ 알림 예약 완료', `${dayjs(notifyDate).format('YYYY.MM.DD HH:mm')}에 알림이 전송됩니다.`);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <View style={{ backgroundColor: bgColor, padding: 24, borderRadius: 16, width: '90%' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: textColor }}>언제 알림을 받을까요?</Text>

                    {[0, -1, -3].map((offset) => (
                        <TouchableOpacity
                            key={offset}
                            onPress={() => setSelectedOffset(offset)}
                            style={{
                                paddingVertical: 8,
                                backgroundColor: selectedOffset === offset ? (isDark ? '#374151' : '#eee') : 'transparent',
                                borderRadius: 8,
                            }}
                        >
                            <Text style={{ fontSize: 16, color: textColor }}>
                                {offset === 0 ? '당일' : `${Math.abs(offset)}일 전`}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {/* 시간 선택 버튼 */}
                    <TouchableOpacity onPress={() => setShowTimePicker(true)} style={{ marginTop: 16 }}>
                        <Text style={{ fontSize: 16, color: textColor }}>⏰ 시간 선택: {dayjs(selectedTime).format('HH:mm')}</Text>
                    </TouchableOpacity>

                    {/* iOS용 picker */}
                    {showTimePicker && Platform.OS === 'ios' && (
                        <Modal visible={true} transparent animationType="fade">
                            <View style={{
                                flex: 1,
                                backgroundColor: 'rgba(0,0,0,0.4)',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <View style={{
                                    backgroundColor: bgColor,
                                    padding: 24,
                                    borderRadius: 16,
                                    width: '80%',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12, color: textColor }}>시간 선택</Text>
                                    <DateTimePicker
                                        value={selectedTime}
                                        mode="time"
                                        display="spinner"
                                        is24Hour={false}
                                        themeVariant={isDark ? 'dark' : 'light'}
                                        onChange={(event, date) => {
                                            if (date) setSelectedTime(date);
                                        }}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowTimePicker(false)}
                                        style={{ marginTop: 12, padding: 10, backgroundColor: '#2563eb', borderRadius: 8 }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: '600' }}>확인</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    )}

                    {/* Android용 picker */}
                    {showTimePicker && Platform.OS === 'android' && (
                        <DateTimePicker
                            value={selectedTime}
                            mode="time"
                            display="clock"
                            is24Hour={false}
                            onChange={(event, date) => {
                                if (event.type === 'set' && date) {
                                    setSelectedTime(date);
                                }
                                setShowTimePicker(false);
                            }}
                        />
                    )}

                    {/* 알림 예약 버튼 */}
                    <TouchableOpacity
                        onPress={handleScheduleNotification}
                        style={{ backgroundColor: '#2563eb', marginTop: 24, padding: 12, borderRadius: 8 }}
                    >
                        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>알림 예약하기</Text>
                    </TouchableOpacity>

                    {/* 닫기 버튼 */}
                    <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
                        <Text style={{ color: '#888', textAlign: 'center' }}>닫기</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
