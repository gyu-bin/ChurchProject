import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {collection, getDocs, onSnapshot, orderBy, query, where} from 'firebase/firestore';
import { db } from '@/firebase/config';
import {useDesign} from "@/context/DesignSystem";

type Notice = {
    id: string;
    type: 'notice' | 'event';
    title: string;
    content: string;
    date?: any;
    startDate?: any;
    endDate?: any;
    time?: string;
    place?: string;
};

export default function HomeNotices() {
    const { colors, spacing, font, radius } = useDesign();

    const [notices, setNotices] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        const noticeQ = query(collection(db, 'notice'), where('type', '==', 'notice'));
        const eventQ = query(collection(db, 'notice'), where('type', '==', 'event'));

        const unsubNotice = onSnapshot(noticeQ, (snapshot) => {
            const noticeList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<Notice, 'id'>),
            }));
            setNotices(noticeList.slice(0, 2)); // 공지사항 2개
        });

        const unsubEvent = onSnapshot(eventQ, (snapshot) => {
            const eventList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<Notice, 'id'>),
            }));
            setEvents(eventList.slice(0, 2)); // 일정 2개
        });

        return () => {
            unsubNotice();
            unsubEvent();
        };
    }, []);

    return (
        <View>
            {/* 📢 공동체 소식 */}
            <View style={{ marginBottom: spacing.lg }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>📢 공동체 소식</Text>
                </View>

                {notices.map((item, idx) => (
                    <View
                        key={idx}
                        style={{
                            backgroundColor: colors.surface,
                            borderRadius: 12,
                            padding: spacing.md,
                            marginBottom: spacing.sm,
                            shadowColor: '#000',
                            shadowOpacity: 0.05,
                            shadowOffset: { width: 0, height: 1 },
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={{
                                backgroundColor: '#E3F2FD',
                                color: '#1976D2',
                                fontSize: 11,
                                fontWeight: 'bold',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                marginRight: 6
                            }}>
                                공지사항
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.subtext }}>
                                {item.date?.seconds
                                    ? new Date(item.date.seconds * 1000).toLocaleDateString('ko-KR')
                                    : ''}
                            </Text>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{item.title}</Text>
                        <Text style={{ fontSize: 14, color: colors.subtext }}>{item.content}</Text>
                    </View>
                ))}
            </View>

            {/* 📅 다가오는 일정 */}
            <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>📅 다가오는 일정</Text>
                </View>

                {events.map((item, idx) => {
                    const eventDate = new Date(item.startDate.seconds * 1000);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const dday = diff === 0 ? 'D-DAY' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;

                    return (
                        <View
                            key={idx}
                            style={{
                                backgroundColor: colors.surface,
                                borderRadius: 12,
                                padding: spacing.md,
                                marginBottom: spacing.sm,
                                shadowColor: '#000',
                                shadowOpacity: 0.05,
                                shadowOffset: { width: 0, height: 1 },
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 4 }}>
                                        {eventDate.toLocaleDateString('ko-KR', {
                                            month: 'numeric',
                                            day: 'numeric',
                                        })}
                                    </Text>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>{item.title}</Text>
                                    <Text style={{ fontSize: 14, color: colors.subtext }}>{item.place}</Text>
                                </View>
                                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{dday}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // paddingHorizontal: 16,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    card: {
        padding: 14,
        marginBottom: 12,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 6,
        marginBottom: 6,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    cardContent: {
        fontSize: 14,
        marginBottom: 6,
    },
    cardDate: {
        fontSize: 12,
        textAlign: 'right',
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    eventDate: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    eventDetail: {
        fontSize: 14,
    },

    ddayText: {
        fontSize: 12,
        marginTop: 4,
    },
});
