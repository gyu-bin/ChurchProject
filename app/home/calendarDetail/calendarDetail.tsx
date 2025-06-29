import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import AlarmModal from '../calendarDetail/calendarAlarm';

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

    return (
        <Modal visible={visible} transparent animationType="fade">
            <TouchableWithoutFeedback onPress={onClose}>
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 24,
                    }}
                >
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View
                            style={{
                                backgroundColor: colors.surface,
                                borderRadius: 16,
                                padding: 20,
                                width: '100%',
                                maxHeight: '60%',
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    marginBottom: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        color: colors.primary,
                                    }}
                                >
                                    {date} 일정
                                </Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Text style={{ color: colors.subtext }}>닫기</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator>
                                {events.length > 0 ? (
                                    events.map(ev => (
                                        <View key={ev.id} style={{ marginBottom: 12 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ fontWeight: 'bold', color: colors.text }}>{ev.title}</Text>
                                                <TouchableOpacity onPress={() => handleOpenAlarm(ev)}>
                                                    <Text style={{ color: colors.primary, fontSize: 13 }}>🔔 알림받기</Text>
                                                </TouchableOpacity>
                                            </View>
                                            {ev.place && (
                                                <Text style={{ color: colors.subtext, fontSize: 13 }}>
                                                    장소: {ev.place}
                                                </Text>
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
                                    <Text style={{ color: colors.subtext }}>
                                        일정이 없습니다.
                                    </Text>
                                )}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>

            {/* 알림 설정 모달 */}
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
