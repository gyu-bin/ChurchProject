import { useDesign } from "@/context/DesignSystem";
import { db } from '@/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import dayjs from "dayjs";

export default function TodayBibleList() {
    const { colors, spacing, font } = useDesign();
    const [todayDevotions, setTodayDevotions] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'devotions'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const all = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
            }));

            const today = dayjs().format('YYYY-MM-DD');
            const filtered = all.filter((item) => {
                const createdAt = item.createdAt?.seconds
                    ? dayjs(item.createdAt.seconds * 1000)
                    : null;
                return createdAt && createdAt.format('YYYY-MM-DD') === today;
            });

            setTodayDevotions(filtered.slice(0, 2));
        });

        return () => unsubscribe();
    }, []);

    return (
        <View style={{ marginBottom: spacing.lg }}>
            <TouchableOpacity onPress={() => router.push('/share/DailyBible')}>
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing.sm,
                }}>
                    <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>오늘의 나눔</Text>
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
                        }}
                    >
                        <Text
                            style={{
                                fontSize: font.body,
                                color: colors.text,
                                marginBottom: spacing.xs,
                            }}
                        >
                            {item.content?.slice(0, 20)}{item.content?.length > 50 ? '...' : ''}
                        </Text>
                        <Text
                            style={{
                                fontSize: font.caption,
                                color: colors.subtext,
                            }}
                        >
                            작성자: {item.authorName}
                        </Text>
                    </View>
                ))
            ) : (
                <Text style={{ color: colors.subtext, fontSize: font.body }}>
                    오늘의 나눔이 없습니다.
                </Text>
            )}
        </View>
    );
}
