import { useDesign } from "@/context/DesignSystem";
import { db } from '@/firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import FlexibleCarousel from "@/components/FlexibleCarousel";
import {router} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import CalendarModal from '../home/QuickMenuButton/calendar';

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

    useEffect(() => {
        const noticeQ = query(collection(db, 'notice'), where('type', '==', 'notice'));

        const unsubNotice = onSnapshot(noticeQ, (snapshot) => {
            const noticeList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<Notice, 'id'>),
            }));
            setNotices(noticeList.slice(0, 5)); // 공지사항 2개
        });

        return () => {
            unsubNotice();
        };
    }, []);

    const renderNoticeCard = (item: Notice) => {
        return (
            <View
                style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: spacing.md,
                    marginBottom: spacing.xs,
                    marginTop: spacing.xs,
                    marginLeft: spacing.xs,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 10,
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
                        {item.date?.seconds ? new Date(item.date.seconds * 1000).toLocaleDateString('ko-KR') : ''}
                    </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                    {item.title}
                </Text>
                <Text
                    style={{ fontSize: 14, color: colors.subtext }}
                    numberOfLines={5} // ✅ 최대 4줄 표시
                    ellipsizeMode="tail" // ✅ 말줄임표 처리
                >
                    {item.content?.slice(0, 90)}{item.content?.length > 90 ? '...' : ''}
                </Text>
            </View>
        );
    };

//오늘의 나눔
    return (
        <View>
            {/* 📢 공동체 소식 */}
            <View style={{ marginBottom: spacing.sm }}>
                    <TouchableOpacity onPress={() => router.push('/home/notice/allNotice')}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>📢 공동체 소식</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.text} />
                        </View>
                    </TouchableOpacity>

                {notices.length >= 1 && (
                    <View>
                        <FlexibleCarousel data={notices} renderItem={renderNoticeCard} />
                    </View>
                )}
            </View>

            {/* 📅 다가오는 일정 */}
        </View>
    );
}
