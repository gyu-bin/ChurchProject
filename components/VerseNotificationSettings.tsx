import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Switch,
    Button,
    Platform,
    Alert,
    TouchableOpacity,
    Modal,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verses } from '@/assets/verses';
import { useAppTheme } from '@/context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

type Verses = { verse: string; reference: string };

export default function PushDevotional() {
    const [enabled, setEnabled] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [time, setTime] = useState(new Date());
    const [tempTime, setTempTime] = useState(new Date());

    const { mode } = useAppTheme();
    const isDark = mode === 'dark';

    const bgColor = isDark ? '#1f2937' : '#f1f5f9';
    const cardColor = isDark ? '#374151' : '#ffffff';
    const textColor = isDark ? '#f9fafb' : '#111827';
    const subTextColor = isDark ? '#9ca3af' : '#6b7280';

    useEffect(() => {
        (async () => {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                await Notifications.requestPermissionsAsync();
            }
        })();

        (async () => {
            const stored = await AsyncStorage.getItem('devotionalEnabled');
            const storedTime = await AsyncStorage.getItem('devotionalTime');
            if (stored) setEnabled(stored === 'true');
            if (storedTime) {
                const parsed = new Date(storedTime);
                setTime(parsed);
                setTempTime(parsed);
            }
        })();
    }, []);

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

    const handleConfirm = async () => {
        console.log('handleConfirm')
        const hours = tempTime.getHours();
        const minutes = tempTime.getMinutes();
        setTime(tempTime);
        setShowPicker(false);

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

    const formatAMPM = (date: Date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${ampm} ${hours.toString().padStart(2, '0')}시 ${minutes.toString().padStart(2, '0')}분`;
    };

    return (
        <View style={{
            backgroundColor: cardColor,
            paddingVertical: 20,
            paddingHorizontal: 16,
            borderRadius: 12,
            marginVertical: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
            alignSelf: 'stretch',
        }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor, marginBottom: 12 }}>
                📖 오늘의 말씀 알림
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: textColor, fontSize: 16 }}>알림 받기</Text>
                <Switch value={enabled} onValueChange={toggleSwitch} />
            </View>

            {enabled && (
                <>
                    <Text style={{ color: subTextColor, marginBottom: 6 }}>
                        설정된 시간: {formatAMPM(time)}
                    </Text>
                    <TouchableOpacity onPress={() => setShowPicker(true)}>
                        <Text style={{ color: '#3b82f6', fontSize: 14 }}>시간 변경</Text>
                    </TouchableOpacity>
                </>
            )}

            {showPicker && (
                Platform.OS === 'ios' ? (
                    <Modal visible={showPicker} transparent animationType="slide">
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
                            <View style={{
                                backgroundColor: isDark ? '#1f2937' : '#fff',
                                padding: 24,
                                borderRadius: 16,
                                width: '80%',
                                alignItems: 'center',
                            }}>
                                <Text style={{ fontSize: 16, marginBottom: 12, color: textColor }}>시간 선택</Text>
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
                                    <Button title="확인" onPress={handleConfirm} />
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
                        onChange={async (event, selectedTime) => {
                            if (event.type === 'set' && selectedTime) {
                                const now = new Date();
                                const correctedTime = new Date(now);
                                correctedTime.setHours(selectedTime.getHours());
                                correctedTime.setMinutes(selectedTime.getMinutes());
                                correctedTime.setSeconds(0);
                                correctedTime.setMilliseconds(0);

                                // 만약 이미 지난 시간이라면 내일로 설정
                                if (correctedTime.getTime() < now.getTime()) {
                                    correctedTime.setDate(correctedTime.getDate() + 1);
                                }

                                console.log('예약 시각:', correctedTime.toString());

                                Alert.alert(
                                    '설정 완료',
                                    `${formatAMPM(correctedTime)}에 랜덤 말씀 알림이 설정되었습니다.`
                                );

                                setTempTime(correctedTime);
                                setTime(correctedTime);
                                setShowPicker(false);

                                await AsyncStorage.setItem('devotionalTime', correctedTime.toString());
                                await Notifications.cancelAllScheduledNotificationsAsync();

                                const randomVerse = verses[Math.floor(Math.random() * verses.length)];

                                await Notifications.scheduleNotificationAsync({
                                    content: {
                                        title: '테스트 알림',
                                        body: '5분 뒤에 울리는지 확인',
                                        sound: true,
                                        channelId: 'default',
                                    },
                                    trigger: {
                                        seconds: 300,
                                    },
                                });
                                /*await Notifications.scheduleNotificationAsync({
                                    content: {
                                        title: '📖 오늘의 말씀',
                                        body: `${randomVerse.verse} (${randomVerse.reference})`,
                                        sound: true,
                                        priority: Notifications.AndroidNotificationPriority.HIGH,
                                    },
                                    trigger: {
                                        date: correctedTime,
                                        repeats: true, // ✅ 매일 반복
                                    },
                                });*/
                            } else {
                                setShowPicker(false);
                            }
                        }}
                    />
                )
            )}
        </View>
    );
}
