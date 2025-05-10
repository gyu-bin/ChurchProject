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
    useColorScheme,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verses } from '@/assets/verses';
import { useAppTheme } from '@/context/ThemeContext';
type Verses = { verse: string; reference: string };

export default function PushDevotional() {
    const [enabled, setEnabled] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [time, setTime] = useState(new Date());
    const [tempTime, setTempTime] = useState(new Date());

// 🔁 변경 후
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
                hour: hours,
                minute: minutes,
                repeats: true,
            } as Notifications.CalendarTriggerInput
        });

        Alert.alert('설정 완료', `${hours}시 ${minutes}분에 랜덤 말씀 알림이 설정되었습니다.`);
    };

    return (
        <View
            style={{
                backgroundColor: cardColor,
                padding: 16,
                borderRadius: 12,
                marginVertical: 12,
            }}
        >
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor, marginBottom: 12 }}>
                📖 오늘의 말씀 알림
            </Text>

            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                }}
            >
                <Text style={{ color: textColor, fontSize: 16 }}>알림 받기</Text>
                <Switch value={enabled} onValueChange={toggleSwitch} />
            </View>

            {enabled && (
                <>
                    <Text style={{ color: subTextColor, marginBottom: 6 }}>
                        설정된 시간: {time.getHours()}시 {time.getMinutes()}분
                    </Text>
                    <TouchableOpacity onPress={() => setShowPicker(true)}>
                        <Text style={{ color: '#3b82f6', fontSize: 14 }}>시간 변경</Text>
                    </TouchableOpacity>
                </>
            )}

            {/* 시간 선택 모달 */}
            <Modal visible={showPicker} transparent animationType="slide">
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <View
                        style={{
                            backgroundColor: isDark ? '#1f2937' : '#fff',
                            padding: 24,
                            borderRadius: 16,
                            width: '80%',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ fontSize: 16, marginBottom: 12, color: textColor }}>시간 선택</Text>
                        <DateTimePicker
                            mode="time"
                            value={tempTime}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(_, selectedTime) => {
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
        </View>
    );
}
