import { useDesign } from "@/context/DesignSystem";
import { db } from '@/firebase/config';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import FlexibleCarousel from "@/components/FlexibleCarousel";
import {router} from "expo-router";

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TodayBible() {
    const { colors, spacing, font } = useDesign();
    const [devot, setDevot] = useState<any[]>([]);

    useEffect(() => {
        const devot = query(collection(db, 'devotions'));
        const unsubNews = onSnapshot(devot, (snapshot) => {
            const newsList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
            }));
            setDevot(newsList);
        });
        return () => unsubNews();
    }, []);

    const renderNewsCard = (item: any) => {

        return (
            <View
                style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: spacing.md,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 5,
                    height: 80,
                    width: SCREEN_WIDTH * 0.7,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{
                        backgroundColor: '#FFF3E0',
                        color: '#FB8C00',
                        fontSize: 11,
                        fontWeight: 'bold',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginRight: 6
                    }}>
                        오늘의 나눔
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.subtext }}>
                        {item.date?.seconds
                            ? new Date(item.date.seconds * 1000).toLocaleDateString('ko-KR')
                            : ''}
                    </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                    {item.authorName}
                </Text>
                <Text numberOfLines={2} style={{ fontSize: 14, color: colors.subtext }}>
                    {item.content?.slice(0, 50)}{item.content?.length > 40 ? '...' : ''}
                </Text>
            </View>
        );
    };

    return (
        <View>
            {devot.length > 0 && (
                <View style={{ marginBottom: spacing.lg }}>
                    <TouchableOpacity onPress={() => router.push('/share/DailyBible')}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>오늘의 나눔</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.text} />
                        </View>
                    </TouchableOpacity>
                    <FlexibleCarousel data={devot} renderItem={renderNewsCard} />
                </View>
            )}
        </View>
    );
}
