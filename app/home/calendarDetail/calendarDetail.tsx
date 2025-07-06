import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Platform,
    Dimensions
} from 'react-native';
import AlarmModal from '../calendarDetail/calendarAlarm';
import {useSafeAreaFrame} from "react-native-safe-area-context";



export default function EventDetailModal({
                                             visible,
                                             onClose,
                                             date,
                                             events,
                                             colors,
                                         }: {
    visible: boolean;
    onClose: () => void;
    date: string;
    events: any[];
    colors: any;
}) {
    const [showAlarmModal, setShowAlarmModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    const handleOpenAlarm = (event: any) => {
        setSelectedEvent(event);
        setShowAlarmModal(true);
    };

    const frame = useSafeAreaFrame();
    const SCREEN_HEIGHT = frame.height;
    // 높이 계산 (이벤트 수에 따라)
    const baseHeight = 200; // 최소 높이
    const itemHeight = 80; // 이벤트 1개당 높이
    const maxHeight = SCREEN_HEIGHT * 0.8; // 최대 높이 80%
    const modalHeight = Math.min(baseHeight + events.length * itemHeight, maxHeight);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'flex-end', // 하단부터 올라오게
                        backgroundColor: 'rgba(0,0,0,0.4)',
                    }}
                >
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View
                            style={{
                                backgroundColor: colors.surface,
                                borderTopLeftRadius: 20,
                                borderTopRightRadius: 20,
                                paddingHorizontal: 20,
                                paddingTop: 10,
                                height: modalHeight,
                            }}
                        >
                            {/* grab bar */}
                            <View
                                style={{
                                    width: 40,
                                    height: 5,
                                    borderRadius: 2.5,
                                    backgroundColor: '#ccc',
                                    alignSelf: 'center',
                                    marginVertical: 8,
                                }}
                            />

                            {/* 상단 헤더 */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    marginBottom: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        color: colors.primary,
                                    }}
                                >
                                    {date} 일정
                                </Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Text style={{ color: colors.subtext, fontSize: 16 }}>닫기</Text>
                                </TouchableOpacity>
                            </View>

                            {/* 일정 목록 */}
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            >
                                {events.length > 0 ? (
                                    events.map(ev => (
                                        <View
                                            key={ev.id}
                                            style={{
                                                backgroundColor: colors.surface,
                                                borderRadius: 12,
                                                padding: 16,
                                                marginBottom: 12,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 2,
                                                elevation: 2, // Android 그림자
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontWeight: '600',
                                                        fontSize: 16,
                                                        color: colors.text,
                                                    }}
                                                >
                                                    {ev.title}
                                                </Text>
                                                <TouchableOpacity onPress={() => handleOpenAlarm(ev)}>
                                                    <Text
                                                        style={{
                                                            color: colors.primary,
                                                            fontSize: 14,
                                                            fontWeight: '500',
                                                        }}
                                                    >
                                                        🔔 알림받기
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>

                                            {ev.place && (
                                                <Text
                                                    style={{
                                                        color: colors.subtext,
                                                        fontSize: 13,
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    📍 장소: {ev.place}
                                                </Text>
                                            )}
                                            {(ev.campus || ev.division) && (
                                                <Text
                                                    style={{
                                                        color: colors.subtext,
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    🏫 {ev.campus ? `캠퍼스: ${ev.campus}` : ''} {ev.division ? `부서: ${ev.division}` : ''}
                                                </Text>
                                            )}
                                        </View>
                                    ))
                                ) : (
                                    <Text style={{ color: colors.subtext, textAlign: 'center', marginTop: 20 }}>
                                        일정이 없습니다.
                                    </Text>
                                )}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>

            {/* 알림 모달 */}
            {selectedEvent && (
                <AlarmModal
                    visible={showAlarmModal}
                    onClose={() => setShowAlarmModal(false)}
                    eventTitle={selectedEvent.title}
                    eventDate={new Date(selectedEvent.startDate?.seconds * 1000)}
                />
            )}
        </Modal>
    );
}
