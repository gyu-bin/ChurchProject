import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, Modal, FlatList,
    SafeAreaView, Animated, PanResponder, Dimensions, Platform
} from 'react-native';
import catechismData from '@/assets/catechism/catechism.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CatechismItem = {
    question_number: number;
    question: string;
    answer: string;
    references?: string[];
};

export default function Catechism() {
    const [selected, setSelected] = useState<number>(1);
    const [modalVisible, setModalVisible] = useState(false);
    const [data, setData] = useState<CatechismItem[]>([]);

    const { colors, font, spacing, radius } = useDesign();
    const { mode } = useAppTheme();
    const insets = useSafeAreaInsets();
    const screenWidth = Dimensions.get('window').width;

    const translateX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setData(catechismData);
        loadLastSeen();
    }, []);

    const loadLastSeen = async () => {
        const stored = await AsyncStorage.getItem('last_seen_question');
        if (stored) setSelected(Number(stored));
    };

    const saveLastSeen = async (num: number) => {
        await AsyncStorage.setItem('last_seen_question', num.toString());
    };

    const animateTo = (direction: 'left' | 'right') => {
        const toValue = direction === 'left' ? -screenWidth : screenWidth;
        Animated.timing(translateX, {
            toValue,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            const newSelected = direction === 'left' ? selected + 1 : selected - 1;
            setSelected(newSelected);
            saveLastSeen(newSelected);
            translateX.setValue(0); // 초기화
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 20,
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx < -50 && selected < data.length) {
                    animateTo('left');
                } else if (gesture.dx > 50 && selected > 1) {
                    animateTo('right');
                }
            }
        })
    ).current;

    const handleSelect = (num: number) => {
        setSelected(num);
        saveLastSeen(num);
        setModalVisible(false);
    };

    const selectedItem = data.find((item) => item.question_number === selected);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top : '8%',}}>
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
                    문항 {selected} ▾
                </Text>
            </TouchableOpacity>

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
                        paddingHorizontal: spacing.md // ✅ 아이폰 여백
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
                                    paddingHorizontal: spacing.md // ✅ 아이폰 여백
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

            {/* 선택된 문항 */}
            {selectedItem && (
                <View style={{ flex: 1 }} {...panResponder.panHandlers}>
                    <Animated.View style={{
                        flex: 1,
                        padding: spacing.lg,
                        transform: [{ translateX }],
                    }}>
                        <View style={{
                            backgroundColor: colors.surface,
                            borderRadius: radius.lg,
                            padding: spacing.lg,
                            justifyContent: 'center',
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
                                Q{selectedItem.question_number}. {selectedItem.question}
                            </Text>

                            <Text style={{
                                fontSize: font.body,
                                color: colors.text,
                                lineHeight: 26
                            }}>
                                {selectedItem.answer}
                            </Text>

                            {Array.isArray(selectedItem.references) && selectedItem.references.length > 0 && (
                                <View style={{ marginTop: spacing.lg }}>
                                    <Text style={{
                                        fontSize: font.caption,
                                        fontWeight: 'bold',
                                        color: colors.subtext,
                                        marginBottom: spacing.sm
                                    }}>
                                        📖 성경 참고 구절:
                                    </Text>
                                    {selectedItem.references.map((ref, idx) => (
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
                    </Animated.View>
                </View>
            )}
        </SafeAreaView>
    );
}
