import { useDesign } from "@/context/DesignSystem";
import { db } from '@/firebase/config';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {Dimensions, Platform, Text, TouchableOpacity, View} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import FlexibleCarousel from "@/components/FlexibleCarousel";
import {router} from "expo-router";
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
// const SCREEN_WIDTH = Dimensions.get('window').width;
export default function ChurchNewsPage() {
    const { colors, spacing, font } = useDesign();
    const [news, setNews] = useState<any[]>([]);

    const frame = useSafeAreaFrame();

    useEffect(() => {
        const newsQ = query(collection(db, 'church_news'));
        const unsubNews = onSnapshot(newsQ, (snapshot) => {
            const newsList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
            }));
            setNews(newsList);
        });
        return () => unsubNews();
    }, []);

    const renderNewsCard = (item: any) => {
        const getBadgeStyle = (type: string) => {
            switch (type) {
                case '공지':
                    return { label: '공지', bgColor: '#E3F2FD', textColor: '#1976D2' };
                case '부고':
                    return { label: '부고', bgColor: '#FFEBEE', textColor: '#D32F2F' };
                case '축하':
                    return { label: '축하', bgColor: '#F3E5F5', textColor: '#8E24AA' };
                default:
                    return { label: '시광 뉴스', bgColor: '#FFF3E0', textColor: '#FB8C00' };
            }
        };

        const { label, bgColor, textColor } = getBadgeStyle(item.type);

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
                    elevation: 5,
                    width: frame.width * 0.7,
                    // paddingLeft: 40
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6,  }}>
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
                        📰 시광 뉴스
                    </Text>
                    <Text style={{
                        backgroundColor: bgColor,
                        color: textColor,
                        fontSize: 11,
                        fontWeight: 'bold',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginRight: 6
                    }}>
                        {label}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.subtext }}>
                        {item.date?.seconds
                            ? new Date(item.date.seconds * 1000).toLocaleDateString('ko-KR')
                            : ''}
                    </Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                    {item.title}
                </Text>
                <Text numberOfLines={3} style={{fontSize: 18, color: colors.subtext }}>
                    {item.content}
                </Text>
            </View>
        );
    };

    return (
        <View>
        {news.length > 0 && (
                <View style={{ marginBottom: spacing.sm }}>
                    <TouchableOpacity onPress={() => router.push('/home/QuickMenuButton/churchNewsPage')}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>📰 시광 뉴스</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.text}/>
                        </View>
                    </TouchableOpacity>
                    <FlexibleCarousel data={news} renderItem={renderNewsCard} />
                </View>
            )}
        </View>
    );
}
