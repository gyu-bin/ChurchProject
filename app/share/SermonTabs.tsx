import React, { useState } from 'react';
import {View, useWindowDimensions, Text, TouchableOpacity, Platform} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useRouter } from 'expo-router';
import SermonSharePage from './sermon/SermonSharePage';
import SermonQuestionPage from './sermon/SermonQuestionPage';
import { Ionicons } from '@expo/vector-icons';
import { useDesign } from '@/context/DesignSystem';
import {useSafeAreaInsets} from "react-native-safe-area-context";

export default function SermonTabs() {
    const layout = useWindowDimensions();
    const { colors, spacing, font } = useDesign();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [index, setIndex] = useState(0);

    const [routes] = useState([
        { key: 'share', title: '📖 설교 나눔' },
        { key: 'question', title: '❓ 설교 질문' },
    ]);

    const renderScene = SceneMap({
        share: SermonSharePage,
        question: SermonQuestionPage,
    });

    const renderTabBar = (props: any) => (
        <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: colors.primary }}
            style={{ backgroundColor: colors.background }}
            activeColor={colors.primary}
            inactiveColor={colors.text}
            renderLabel={({ route, color }: any) => (
                <Text
                    style={{
                        color,
                        fontWeight: 'bold',
                        fontSize: font.heading,
                    }}
                    allowFontScaling={false}
                >
                    {route.title}
                </Text>
            )}
        />
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop:Platform.OS === 'android' ? insets.top : insets.top}}>
            {/* 상단 헤더 */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                backgroundColor: colors.background,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                position: 'relative', // 💥 절대 위치 기준
            }}>
                {/* 뒤로가기 버튼 */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        position: 'absolute',
                        left: spacing.md,
                        padding: 4,
                    }}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>

                {/* 현재 탭 이름 */}
                <Text style={{
                    fontSize: font.heading,
                    fontWeight: 'bold',
                    color: colors.text,
                }}>
                    {index === 0 ? '설교 나눔' : '설교 질문'}
                </Text>
            </View>

            {/* 탭뷰 */}
            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                renderTabBar={renderTabBar}
                onIndexChange={setIndex}
                initialLayout={{ width: layout.width }}
            />
        </View>
    );
}
