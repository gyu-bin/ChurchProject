import { useDesign } from "@/context/DesignSystem";
import { db } from '@/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {View, Text, TouchableOpacity, useColorScheme} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import dayjs from "dayjs";

export default function TodayBibleList() {
    const { colors, spacing, font } = useDesign();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [todayDevotions, setTodayDevotions] = useState<any[]>([]);
    const [todayGratitudes, setTodayGratitudes] = useState<any[]>([]);

    useEffect(() => {
        // 📖 오늘의 나눔 가져오기
        const devotionQuery = query(collection(db, 'devotions'), orderBy('createdAt', 'desc'));
        const unsubscribeDevotions = onSnapshot(devotionQuery, (snapshot) => {
            const allDevotions = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
            }));

            const today = dayjs().format('YYYY-MM-DD');
            const filteredDevotions = allDevotions.filter((item) => {
                const createdAt = item.createdAt?.seconds
                    ? dayjs(item.createdAt.seconds * 1000)
                    : null;
                return createdAt && createdAt.format('YYYY-MM-DD') === today;
            });

            setTodayDevotions(filteredDevotions.slice(0, 2));
        });

        // 🙏 오늘의 감사나눔 가져오기
        const gratitudeQuery = query(collection(db, 'gratitudes'), orderBy('createdAt', 'desc'));
        const unsubscribeGratitudes = onSnapshot(gratitudeQuery, (snapshot) => {
            const allGratitudes = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
            }));

            const today = dayjs().format('YYYY-MM-DD');
            const filteredGratitudes = allGratitudes.filter((item) => {
                const createdAt = item.createdAt?.seconds
                    ? dayjs(item.createdAt.seconds * 1000)
                    : null;
                return createdAt && createdAt.format('YYYY-MM-DD') === today;
            });

            setTodayGratitudes(filteredGratitudes.slice(0, 2));
        });

        return () => {
            unsubscribeDevotions();
            unsubscribeGratitudes();
        };
    }, []);

    return (
        <View>
            {/* 📖 오늘의 나눔 */}
            <TouchableOpacity onPress={() => router.push('/share/DailyBible')}>
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing.sm,
                }}>
                    <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>📖 오늘의 나눔</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </View>
            </TouchableOpacity>

            {todayDevotions.length > 0 ? (
                todayDevotions.map((item, index) => (
                    <View
                        key={item.id}
                        style={{
                            paddingVertical: spacing.md,
                            marginBottom: index < todayDevotions.length - 1 ? spacing.sm : 0,
                            borderBottomWidth: index < todayDevotions.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                            backgroundColor: colors.surface,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: font.body,
                                color: colors.text,
                                marginBottom: spacing.xs,
                            }}
                        >
                            {item.content?.slice(0, 40)}{item.content?.length > 40 ? '...' : ''}
                        </Text>
                        <Text
                            style={{
                                fontSize: font.caption,
                                color: colors.subtext,
                            }}
                        >
                            {item.authorName}
                        </Text>
                    </View>
                ))
            ) : (
                <Text style={{ color: colors.subtext, fontSize: font.body }}>
                    오늘의 나눔이 없습니다.
                </Text>
            )}

            <View
                style={{
                    height: 0.5,
                    backgroundColor: isDark
                        ? 'rgba(255,255,255,0.1)' // 다크모드: 연한 화이트
                        : 'rgba(0,0,0,0.1)',      // 라이트모드: 연한 블랙
                    marginVertical: spacing.sm,
                }}
            />

            {/* 🙏 오늘의 감사나눔 */}
            <TouchableOpacity onPress={() => router.push('/share/thank')}>
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: spacing.lg,
                    marginBottom: spacing.sm,
                }}>
                    <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>🙏 오늘의 감사나눔</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </View>
            </TouchableOpacity>

            {todayGratitudes.length > 0 ? (
                todayGratitudes.map((item, index) => (
                    <View
                        key={item.id}
                        style={{
                            paddingVertical: spacing.md,
                            marginBottom: index < todayGratitudes.length - 1 ? spacing.sm : 0,
                            borderBottomWidth: index < todayGratitudes.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                            backgroundColor: colors.surface,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: font.body,
                                color: colors.text,
                                marginBottom: spacing.xs,
                            }}
                        >
                            {item.content?.slice(0, 41)}{item.content?.length > 40 ? '...' : ''}
                        </Text>
                        <Text
                            style={{
                                fontSize: font.caption,
                                color: colors.subtext,
                            }}
                        >
                            {item.authorName}
                        </Text>
                    </View>
                ))
            ) : (
                <Text style={{ color: colors.subtext, fontSize: font.body }}>
                    오늘의 감사나눔이 없습니다.
                </Text>
            )}
        </View>
    );
}
