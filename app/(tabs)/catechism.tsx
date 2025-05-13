import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, Modal, FlatList, SafeAreaView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PagerView from 'react-native-pager-view';
import largerData from '@/assets/catechism/largerCatechism.json';
import shorterData from '@/assets/catechism/shorterCatechism.json';
import sgData from '@/assets/catechism/catechism.json';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const categories = [
    { label: '대요리 문답', key: 'larger', data: largerData },
    { label: '소요리 문답', key: 'shorter', data: shorterData },
    { label: '시광교리 문답', key: 'sg', data: sgData },
];

export default function CatechismPage() {
    const pagerRef = useRef<PagerView>(null);
    const [selectedCategory, setSelectedCategory] = useState(categories[1]); // default: 소요리문답
    const [modalVisible, setModalVisible] = useState(false);
    const [categoryModal, setCategoryModal] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const { mode } = useAppTheme();
    const { colors, font, spacing, radius } = useDesign();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadState();
    }, []);

    const loadState = async () => {
        const storedCate = await AsyncStorage.getItem('last_catechism_category');
        const storedNum = await AsyncStorage.getItem(`last_seen_${storedCate || 'shorter'}`);
        const found = categories.find(c => c.key === storedCate);
        if (found) setSelectedCategory(found);
        if (storedNum) setCurrentIndex(Math.max(parseInt(storedNum) - 1, 0));
    };

    const saveState = async (cateKey: string, index: number) => {
        await AsyncStorage.setItem('last_catechism_category', cateKey);
        await AsyncStorage.setItem(`last_seen_${cateKey}`, (index + 1).toString());
    };

    const handlePageSelected = async (e: any) => {
        const newIndex = e.nativeEvent.position;
        setCurrentIndex(newIndex);
        await saveState(selectedCategory.key, newIndex);
    };

    const handleSelect = (num: number) => {
        const index = Math.max(num - 1, 0);
        setCurrentIndex(index);
        pagerRef.current?.setPage(index);
        saveState(selectedCategory.key, index);
        setModalVisible(false);
    };

    const handleCategoryChange = (category: typeof selectedCategory) => {
        setSelectedCategory(category);
        setCurrentIndex(0);
        saveState(category.key, 0);
        pagerRef.current?.setPage(0);
        setCategoryModal(false);
    };

    return (
        <SafeAreaView style={{
            flex: 1,
            backgroundColor: colors.background,

        }}>
            {/* 📌 상단 교리문답 선택 버튼 */}
            <TouchableOpacity
                onPress={() => setCategoryModal(true)}
                style={{ alignItems: 'center', marginBottom: spacing.sm,paddingTop: Platform.OS === 'android' ? '10%': '3%', }}
            >
                <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.primary }}>
                    {selectedCategory.label} ▾
                </Text>
            </TouchableOpacity>

            {/* 📌 문항 선택 버튼 */}
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

            {/* 📄 문항 슬라이드 뷰 */}
            <PagerView
                ref={pagerRef}
                initialPage={currentIndex}
                style={{ flex: 1 }}
                onPageSelected={handlePageSelected}
            >
                {selectedCategory.data.map((item, index) => (
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

            {/* 🧾 문항 선택 모달 */}
            <Modal visible={modalVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    <FlatList
                        data={selectedCategory.data}
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

            {/* 🧩 카테고리 선택 모달 */}
            <Modal visible={categoryModal} animationType="fade" transparent>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setCategoryModal(false)}
                    activeOpacity={1}
                >
                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 24, width: '70%' }}>
                        {categories.map((cat) => (
                            <TouchableOpacity key={cat.key} onPress={() => handleCategoryChange(cat)}>
                                <Text style={{
                                    color: selectedCategory.key === cat.key ? colors.primary : colors.text,
                                    fontSize: 20,
                                    fontWeight: '600',
                                    paddingVertical: 8
                                }}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}
