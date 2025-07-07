import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import dayjs from 'dayjs';
import { useDesign } from '@/context/DesignSystem';

LocaleConfig.locales['ko'] = {
  monthNames: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  monthNamesShort: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onSave: (date: Date | { start: Date; end: Date }) => void;
  mode: 'single' | 'range';
  colors: any;
  spacing: any;
};

export default function CustomDateModal({
  isVisible,
  onClose,
  onSave,
  mode = 'single',
  colors,
  spacing,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [isSelectingStart, setIsSelectingStart] = useState(true);

  const handleDayPress = (day: { dateString: string }) => {
    const selected = new Date(day.dateString);

    if (mode === 'single') {
      setSelectedDate(selected);
    } else {
      if (isSelectingStart) {
        setRangeStart(selected);
        setRangeEnd(selected);
        setIsSelectingStart(false);
      } else {
        if (rangeStart && selected < rangeStart) {
          Alert.alert('오류', '종료일은 시작일 이후여야 합니다.');
        } else {
          setRangeEnd(selected);
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
          selectedColor: colors.primary, // ✅ 파란색 원형
          textColor: '#fff', // ✅ 글자색 흰색
        },
      };
    }

    if (mode === 'range' && rangeStart && rangeEnd) {
      const marked: any = {};
      let current = dayjs(rangeStart);
      const end = dayjs(rangeEnd);

      while (current.isBefore(end) || current.isSame(end)) {
        const dateStr = current.format('YYYY-MM-DD');
        marked[dateStr] = {
          color: colors.primary + '33',
          textColor: colors.text,
        };
        current = current.add(1, 'day');
      }

      marked[dayjs(rangeStart).format('YYYY-MM-DD')].startingDay = true;
      marked[dayjs(rangeEnd).format('YYYY-MM-DD')].endingDay = true;

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
      if (rangeStart && rangeEnd && rangeEnd >= rangeStart) {
        onSave({ start: rangeStart, end: rangeEnd });
        resetState();
      } else {
        Alert.alert('날짜 오류', '시작일과 종료일을 올바르게 선택해주세요.');
      }
    }
  };

  const resetState = () => {
    setSelectedDate(null);
    setRangeStart(null);
    setRangeEnd(null);
    setIsSelectingStart(true);
    onClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType='slide'>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
        <View
          style={{
            width: '90%',
            borderRadius: 12,
            backgroundColor: colors.surface,
            padding: 20,
          }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 10,
              color: colors.text,
            }}>
            {mode === 'single' ? '날짜 선택' : '기간 선택'}
          </Text>

          <Calendar
            // markingType='simple' // ✅ 원형 배경 표시
            markedDates={getMarkedDates()}
            current={dayjs().format('YYYY-MM-DD')}
            onDayPress={handleDayPress}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.subtext,
              selectedDayBackgroundColor: colors.primary, // ✅ 선택한 날짜 배경 파란색 원형
              selectedDayTextColor: '#fff', // ✅ 선택한 날짜 글자색 흰색
              dayTextColor: colors.text,
              monthTextColor: colors.text,
              arrowColor: colors.primary,
              textDisabledColor: '#ccc',
              todayTextColor: colors.primary,
            }}
          />

          <View style={{ flexDirection: 'row', marginTop: 20 }}>
            <TouchableOpacity
              onPress={resetState}
              style={{
                flex: 1,
                backgroundColor: colors.border,
                padding: spacing.sm,
                marginRight: 8,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{ color: colors.text }}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={{
                flex: 1,
                backgroundColor: colors.primary,
                padding: spacing.sm,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
