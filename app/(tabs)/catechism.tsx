import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, Modal, FlatList, SafeAreaView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PagerView from 'react-native-pager-view';
import catechismData from '@/assets/catechism/catechism.json';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CatechismItem = {
    question_number: number;
    question: string;
    answer: string;
    references?: string[];
};

export default function CatechismPager() {
    const pagerRef = useRef<PagerView>(null);
    const [data, setData] = useState<CatechismItem[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const { mode } = useAppTheme();
    const { colors, font, spacing, radius } = useDesign();
    const insets = useSafeAreaInsets();

    const isDark = mode === 'dark';

    useEffect(() => {
        setData(catechismData);
        loadLastSeen();
    }, []);

    const loadLastSeen = async () => {
        const stored = await AsyncStorage.getItem('last_seen_question');
        if (stored) {
            const index = Math.max(parseInt(stored) - 1, 0);
            setCurrentIndex(index);
        }
    };

    const saveLastSeen = async (index: number) => {
        await AsyncStorage.setItem('last_seen_question', (index + 1).toString());
    };

    const handlePageSelected = async (e: any) => {
        const newIndex = e.nativeEvent.position;
        setCurrentIndex(newIndex);
        await saveLastSeen(newIndex);
    };

    const handleSelect = (num: number) => {
        const index = Math.max(num - 1, 0);
        setCurrentIndex(index);
        pagerRef.current?.setPage(index);
        saveLastSeen(index);
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'android' ? insets.top : '8%',
        }}>
            {/* 문항 선택 버튼 */}
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={{
                    backgroundColor: colors.surface,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    alignItems: 'center',
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}
            >
                <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.primary }}>
                    문항 {currentIndex + 1} ▾
                </Text>
            </TouchableOpacity>

            {/* 문항 슬라이드 뷰 */}
            <PagerView
                ref={pagerRef}
                initialPage={currentIndex}
                style={{ flex: 1 }}
                onPageSelected={handlePageSelected}
            >
                {data.map((item, index) => (
                    <View key={index} style={{ padding: spacing.lg }}>
                        <View style={{
                            backgroundColor: colors.surface,
                            borderRadius: radius.lg,
                            padding: spacing.lg,
                            shadowColor: '#000',
                            shadowOpacity: 0.05,
                            shadowRadius: 6,
                            elevation: 3
                        }}>
                            <Text style={{
                                fontSize: font.heading,
                                fontWeight: 'bold',
                                color: colors.primary,
                                marginBottom: spacing.md,
                            }}>
                                Q{item.question_number}. {item.question}
                            </Text>

                            <Text style={{
                                fontSize: font.body,
                                color: colors.text,
                                lineHeight: 26
                            }}>
                                {item.answer}
                            </Text>

                            {Array.isArray(item.references) && item.references.length > 0 && (
                                <View style={{ marginTop: spacing.lg }}>
                                    <Text style={{
                                        fontSize: font.caption,
                                        fontWeight: 'bold',
                                        color: colors.subtext,
                                        marginBottom: spacing.sm
                                    }}>
                                        📖 성경 참고 구절:
                                    </Text>
                                    {item.references.map((ref, idx) => (
                                        <Text key={idx} style={{
                                            fontSize: font.caption,
                                            color: colors.subtext,
                                            marginLeft: spacing.sm
                                        }}>
                                            • {ref}
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </PagerView>

            {/* 문항 선택 모달 */}
            <Modal visible={modalVisible} animationType="slide">
                <SafeAreaView
                    style={{
                        flex: 1,
                        backgroundColor: colors.background,
                        paddingTop: spacing.md,
                        paddingBottom: spacing.md,
                    }}
                >
                    <Text style={{
                        fontSize: font.heading,
                        fontWeight: 'bold',
                        color: colors.primary,
                        marginBottom: spacing.md,
                        paddingHorizontal: spacing.md
                    }}>
                        문항 선택
                    </Text>

                    <FlatList
                        data={data}
                        keyExtractor={(item) => item.question_number.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => handleSelect(item.question_number)}
                                style={{
                                    paddingVertical: spacing.md,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                    paddingHorizontal: spacing.md
                                }}
                            >
                                <Text style={{ fontSize: font.body, color: colors.text }}>
                                    문 {item.question_number}. {item.question}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />

                    <TouchableOpacity
                        onPress={() => setModalVisible(false)}
                        style={{
                            marginTop: spacing.lg,
                            backgroundColor: colors.primary,
                            paddingVertical: spacing.md,
                            borderRadius: radius.md,
                            alignItems: 'center'
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: font.body }}>
                            닫기
                        </Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
