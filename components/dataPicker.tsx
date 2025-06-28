import { Modal, Platform, Alert, Text, TouchableOpacity, View } from 'react-native';
import { Calendar , LocaleConfig } from 'react-native-calendars';
import { useState } from 'react';
import { useDesign } from '@/context/DesignSystem';
import type { DateData } from 'react-native-calendars';

LocaleConfig.locales['ko'] = {
    monthNames: [
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월'
    ],
    monthNamesShort: [
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월'
    ],
    dayNames: [
        '일요일', '월요일', '화요일', '수요일',
        '목요일', '금요일', '토요일'
    ],
    dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
    today: '오늘'
};
LocaleConfig.defaultLocale = 'ko';

type Props = {
    isVisible: boolean;
    onClose: () => void;
    onSave: (date: Date) => void | ((start: Date, end: Date) => void);
    mode: 'single' | 'range';
    colors: any;
    spacing: any;
};

export default function CustomDateModal({ isVisible, onClose, onSave, mode = 'single', colors, spacing }: Props) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isSelectingStart, setIsSelectingStart] = useState(true);

    const todayString = new Date().toISOString().split('T')[0];

    const handleDayPress = (day: any) => {
        const selected = new Date(day.dateString);

        if (mode === 'single') {
            setSelectedDate(selected);
        } else {
            if (isSelectingStart) {
                setStartDate(selected);
                setEndDate(selected);
                setIsSelectingStart(false);
            } else {
                if (startDate && selected < startDate) {
                    Alert.alert('오류', '종료일은 시작일 이후여야 합니다.');
                } else {
                    setEndDate(selected);
                    setIsSelectingStart(true);
                }
            }
        }
    };

    const getMarkedDates = () => {
        if (mode === 'single' && selectedDate) {
            return {
                [selectedDate.toISOString().split('T')[0]]: {
                    selected: true,
                    selectedColor: colors.primary,
                },
            };
        }

        if (mode === 'range' && startDate && endDate) {
            const marked: any = {};
            let current = new Date(startDate);
            while (current <= endDate) {
                const key = current.toISOString().split('T')[0];
                marked[key] = {
                    color: colors.primary + '33',
                    textColor: colors.text,
                };
                current.setDate(current.getDate() + 1);
            }
            marked[startDate.toISOString().split('T')[0]].startingDay = true;
            marked[endDate.toISOString().split('T')[0]].endingDay = true;
            return marked;
        }

        return {};
    };

    const handleSave = () => {
        if (mode === 'single') {
            if (selectedDate) {
                onSave(selectedDate);
                resetState();
            } else {
                Alert.alert('날짜 선택', '날짜를 선택해주세요.');
            }
        } else {
            if (startDate && endDate && endDate >= startDate) {
                (onSave as (start: Date, end: Date) => void)(startDate, endDate);
                resetState();
            } else {
                Alert.alert('날짜 선택', '시작일과 종료일을 올바르게 선택해주세요.');
            }
        }
    };

    const resetState = () => {
        setSelectedDate(null);
        setStartDate(null);
        setEndDate(null);
        setIsSelectingStart(true);
        onClose();
    };

    return (
        <Modal visible={isVisible} transparent animationType="slide">
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View style={{ width: '90%', borderRadius: 12, backgroundColor: colors.surface, padding: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colors.text }}>
                        {mode === 'single' ? '날짜 선택' : '시작일과 종료일 선택'}
                    </Text>

                    <Calendar
                        current={(mode === 'single' ? selectedDate : startDate)?.toISOString().split('T')[0]}
                        onDayPress={handleDayPress}
                        markedDates={getMarkedDates()}
                        markingType={mode === 'range' ? 'period' : undefined}
                        theme={{
                            calendarBackground: colors.surface,
                            dayTextColor: colors.text,
                            monthTextColor: colors.text,
                            arrowColor: colors.primary,
                            textDisabledColor: '#ccc',
                            todayTextColor: colors.primary,
                            selectedDayBackgroundColor: colors.primary,
                            selectedDayTextColor: '#fff',
                            textDayFontSize: 14,
                            textMonthFontSize: 16,
                            textMonthFontWeight: 'bold',
                        }}
                        renderHeader={(date) => {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            return (
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
                                    {`${year}년 ${month}월`}
                                </Text>
                            );
                        }}
                        dayComponent={(props) => {
                            const date = props.date;
                            const state = props.state;

                            if (!date) return null;

                            const day = date.day;
                            const dateStr = date.dateString;
                            const dayOfWeek = new Date(dateStr).getDay();

                            const isSunday = dayOfWeek === 0;
                            const isSaturday = dayOfWeek === 6;
                            const isToday = dateStr === todayString;

                            let textColor = colors.text;
                            if (isSunday) textColor = '#e74c3c';
                            else if (isSaturday) textColor = '#3498db';
                            if (state === 'disabled') textColor = '#ccc';

                            return (
                                <View
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isToday ? colors.primary : 'transparent',
                                    }}
                                >
                                    <Text style={{ color: isToday ? '#fff' : textColor, fontWeight: '600' }}>
                                        {day}
                                    </Text>
                                </View>
                            );
                        }}
                    />

                    <View style={{ flexDirection: 'row', marginTop: 20 }}>
                        <TouchableOpacity
                            onPress={resetState}
                            style={{ flex: 1, backgroundColor: colors.border, padding: spacing.sm, marginRight: 8, borderRadius: 8, alignItems: 'center' }}
                        >
                            <Text style={{ color: colors.text }}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={{ flex: 1, backgroundColor: colors.primary, padding: spacing.sm, borderRadius: 8, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>저장</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
