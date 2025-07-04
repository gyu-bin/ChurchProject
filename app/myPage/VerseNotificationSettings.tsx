import { useAppTheme } from '@/context/ThemeContext';
import { verses } from '@/assets/verses';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Modal,
    Platform,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type Verses = { verse: string; reference: string };

export default function PushDevotional() {
    const [enabled, setEnabled] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [time, setTime] = useState(new Date());
    const [tempTime, setTempTime] = useState(new Date());

    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const textColor = isDark ? '#f9fafb' : '#111827';
    const subTextColor = isDark ? '#9ca3af' : '#6b7280';
    const cardColor = isDark ? '#374151' : '#ffffff';

    // 📌 최초 실행 시 알림 등록 및 예약 불러오기
    useEffect(() => {
        (async () => {
            const permission = await Notifications.getPermissionsAsync();
            if (permission.status !== 'granted') {
                await Notifications.requestPermissionsAsync();
            }

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: '기본 알림',
                    importance: Notifications.AndroidImportance.HIGH,
                    sound: 'default',
                });
            }

            const savedEnabled = await AsyncStorage.getItem('devotionalEnabled');
            const savedTime = await AsyncStorage.getItem('devotionalTime');
            if (savedEnabled === 'true' && savedTime) {
                const parsed = new Date(savedTime);
                setEnabled(true);
                setTime(parsed);
                setTempTime(parsed);
                await scheduleDailyAlarm(parsed);
            }
        })();
    }, []);

    // 🔔 알림 스케줄 함수 (매일 재예약)
    const scheduleDailyAlarm = async (targetTime: Date) => {
        const now = new Date();
        const alarmTime = new Date();
        alarmTime.setHours(targetTime.getHours());
        alarmTime.setMinutes(targetTime.getMinutes());
        alarmTime.setSeconds(0);
        alarmTime.setMilliseconds(0);

        if (alarmTime <= now) {
            alarmTime.setDate(alarmTime.getDate() + 1); // 오늘 시간 지났으면 내일
        }

        await Notifications.cancelAllScheduledNotificationsAsync();

        const verse = verses[Math.floor(Math.random() * verses.length)];

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📖 오늘의 말씀',
                body: `${verse.verse} (${verse.reference})`,
                sound: true,
                channelId: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
            }as any,
            trigger: {
                type: 'date',
                date: alarmTime,
            } as Notifications.DateTriggerInput,
        });
    };

    // 📌 알림 설정 스위치 토글
    const toggleSwitch = async (value: boolean) => {
        setEnabled(value);
        await AsyncStorage.setItem('devotionalEnabled', value.toString());

        if (value) {
            setShowPicker(true);
        } else {
            await Notifications.cancelAllScheduledNotificationsAsync();
            Alert.alert('알림 꺼짐', '오늘의 말씀 알림이 비활성화되었습니다.');
        }
    };

    // 📌 시간 포맷
    const formatAMPM = (date: Date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${ampm} ${hours.toString().padStart(2, '0')}시 ${minutes.toString().padStart(2, '0')}분`;
    };

    // 📌 시간 확정 시
    const confirmTime = async () => {
        const hours = tempTime.getHours();
        const minutes = tempTime.getMinutes();
        setTime(tempTime);
        setShowPicker(false);
        Alert.alert('설정 완료', `${formatAMPM(tempTime)}에 말씀 알림이 설정되었습니다.`);
        await AsyncStorage.setItem('devotionalTime', tempTime.toString());
        await Notifications.cancelAllScheduledNotificationsAsync();

        const randomVerse: Verses = verses[Math.floor(Math.random() * verses.length)];

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📖 오늘의 말씀',
                body: `${randomVerse.verse} (${randomVerse.reference})`,
            },
            trigger: {
                type: 'calendar',
                hour: hours,
                minute: minutes,
                repeats: true,
            } as Notifications.CalendarTriggerInput,
        });
    };

    // ✅ Android용 시간 변경 처리
    const handleAndroidTimeChange = async (event: any, selectedTime?: Date) => {
        if (event.type === 'set' && selectedTime) {
            setTempTime(selectedTime);
            setTime(selectedTime);
            setShowPicker(false);
            await AsyncStorage.setItem('devotionalTime', selectedTime.toString());
            await scheduleDailyAlarm(selectedTime);
            Alert.alert('설정 완료', `${formatAMPM(selectedTime)}에 말씀 알림이 설정되었습니다.`);
        } else {
            setShowPicker(false);
        }
    };

    return (
        <View style={{
            backgroundColor: cardColor,
            padding: 20,
            borderRadius: 16,
            marginVertical: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 5,
        }}>
            {/* 타이틀 */}
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor, marginBottom: 16 }}>
                📖 오늘의 말씀 알림
            </Text>

            {/* 알림 스위치 */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderColor: '#e5e7eb',
            }}>
                <Text style={{ fontSize: 16, color: textColor }}>알림 받기</Text>
                <Switch value={enabled} onValueChange={toggleSwitch} />
            </View>

            {/* 알림 시간 */}
            {enabled && (
                <View style={{ marginTop: 16 }}>
                    <Text style={{ color: subTextColor, fontSize: 14, marginBottom: 6 }}>
                        설정된 시간: <Text style={{ fontWeight: '600', color: textColor }}>{formatAMPM(time)}</Text>
                    </Text>
                    <TouchableOpacity onPress={() => setShowPicker(true)}>
                        <Text style={{
                            fontSize: 14,
                            color: '#3b82f6',
                            fontWeight: '500',
                            paddingVertical: 6,
                        }}>
                            시간 변경
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 시간 선택 Picker */}
            {showPicker && (
                Platform.OS === 'ios' ? (
                    <Modal visible={showPicker} transparent animationType="fade">
                        <View style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <View style={{
                                backgroundColor: isDark ? '#1f2937' : '#fff',
                                padding: 24,
                                borderRadius: 16,
                                width: '80%',
                                alignItems: 'center',
                            }}>
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: '600',
                                    marginBottom: 12,
                                    color: textColor
                                }}>
                                    시간 선택
                                </Text>
                                <DateTimePicker
                                    mode="time"
                                    value={tempTime}
                                    display="spinner"
                                    is24Hour={false}
                                    themeVariant={isDark ? 'dark' : 'light'}
                                    onChange={(event, selectedTime) => {
                                        if (selectedTime) setTempTime(selectedTime);
                                    }}
                                />
                                <View style={{ flexDirection: 'row', marginTop: 20 }}>
                                    <Button title="취소" onPress={() => setShowPicker(false)} />
                                    <View style={{ width: 20 }} />
                                    <Button title="확인" onPress={confirmTime} />
                                </View>
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        mode="time"
                        value={tempTime}
                        display="spinner"
                        is24Hour={false}
                        onChange={handleAndroidTimeChange}
                    />
                )
            )}
        </View>
    );
}
