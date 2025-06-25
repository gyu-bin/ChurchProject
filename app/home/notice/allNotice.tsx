import React, { useEffect, useState } from 'react';
import {View, Text, ActivityIndicator, ScrollView, TouchableOpacity, Platform} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '../../context/DesignSystem';
import {useSafeAreaInsets} from "react-native-safe-area-context";

interface NoticeItem {
    id: string;
    title: string;
    content: string;
    date?: {
        seconds: number;
        nanoseconds: number;
    };
}

export default function NoticePage() {
    const [notices, setNotices] = useState<NoticeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { colors, spacing, font } = useDesign();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const q = query(collection(db, 'notice'), where('type', '==', 'notice'));
                const snapshot = await getDocs(q);
                const fetched: NoticeItem[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as NoticeItem[];
                setNotices(fetched);
            } catch (e) {
                console.error('❌ 공지 불러오기 실패:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchNotices();
    }, []);

    if (loading) {
        return <ActivityIndicator style={{ marginTop: 20 }} />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top : 0,}}>
            {/* ✅ 상단 헤더 */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>공지사항</Text>

                {/* 오른쪽 빈 공간 확보 */}
                <View style={{ width: 24 }} />
            </View>

            {/* ✅ 공지사항 목록 */}
            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                {notices.length > 0 ? (
                    notices.map(item => {
                        const formattedDate = item.date?.seconds
                            ? new Date(item.date.seconds * 1000).toLocaleDateString('ko-KR')
                            : '';

                        return (
                            <View
                                key={item.id}
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
                                    <Text
                                        style={{
                                            backgroundColor: '#E3F2FD',
                                            color: '#1976D2',
                                            fontSize: 11,
                                            fontWeight: 'bold',
                                            paddingHorizontal: 6,
                                            paddingVertical: 2,
                                            borderRadius: 4,
                                            marginRight: 6,
                                        }}
                                    >
                                        공지사항
                                    </Text>
                                    <Text style={{ fontSize: 12, color: colors.subtext }}>{formattedDate}</Text>
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                                    {item.title}
                                </Text>
                                <Text style={{ fontSize: 14, color: colors.subtext }}>{item.content}</Text>
                            </View>
                        );
                    })
                ) : (
                    <Text style={{ color: colors.subtext, textAlign: 'center' }}>공지사항이 없습니다.</Text>
                )}
            </ScrollView>
        </View>
    );
}
