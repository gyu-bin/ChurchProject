// pages/gratitude/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, TextInput, Modal,
    KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
    Dimensions, PanResponder
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';

const { height } = Dimensions.get('window');

type Gratitude = {
    id: string;
    content: string;
    createdAt: {
        seconds: number;
        nanoseconds: number;
    };
    authorEmail?: string;
    authorName?: string;
};

export default function ThanksPage() {
    const [gratitudes, setGratitudes] = useState<Gratitude[]>([]);
    const [filterDate, setFilterDate] = useState<Date>(new Date());
    const [content, setContent] = useState('');
    const [writeModalVisible, setWriteModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [user, setUser] = useState<any>(null);

    const { colors, spacing, font, radius } = useDesign();
    const { mode } = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx > 50) {
                    setFilterDate(prev => {
                        const newDate = new Date(prev);
                        newDate.setDate(newDate.getDate() - 1);
                        return newDate;
                    });
                } else if (gestureState.dx < -50) {
                    setFilterDate(prev => {
                        const newDate = new Date(prev);
                        newDate.setDate(newDate.getDate() + 1);
                        return newDate;
                    });
                }
            },
        })
    ).current;

    useEffect(() => {
        getCurrentUser().then(setUser);
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'gratitudes'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const data = snapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as Gratitude)
            );
            const start = new Date(filterDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(filterDate);
            end.setHours(23, 59, 59, 999);
            const filtered = data.filter(item => {
                const createdAt = new Date(item.createdAt?.seconds * 1000);
                return createdAt >= start && createdAt <= end;
            });
            setGratitudes(filtered);
        });
        return () => unsubscribe();
    }, [filterDate]);

    const handleSubmit = async () => {
        if (!content.trim() || !user) return;
        try {
            await addDoc(collection(db, 'gratitudes'), {
                content,
                createdAt: new Date(),
                authorEmail: user.email,
                authorName: user.name,
            });
            setContent('');
            setWriteModalVisible(false);
        } catch (e) {
            console.error('작성 오류', e);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top : insets.top}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>🙏 오늘의 감사나눔</Text>
                <TouchableOpacity onPress={() => setWriteModalVisible(true)}>
                    <Ionicons name="create-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View {...panResponder.panHandlers} style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md }}>
                <TouchableOpacity
                    onPress={() => {
                        setFilterDate(prev => {
                            const newDate = new Date(prev ?? new Date());
                            newDate.setDate(newDate.getDate() - 1);
                            return newDate;
                        });
                    }}
                    style={{
                        padding: 8,
                        marginRight: 16,
                    }}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.surface,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 20,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                    }}>
                    <Text style={{
                        fontSize: 18,
                        fontWeight: '600',
                        color: colors.text,
                    }}>
                        {filterDate ? format(filterDate, 'yyyy-MM-dd') : ''}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        setFilterDate(prev => {
                            const newDate = new Date(prev ?? new Date());
                            newDate.setDate(newDate.getDate() + 1);
                            return newDate;
                        });
                    }}
                    style={{
                        padding: 8,
                        marginLeft: 16,
                    }}
                >
                    <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                display="inline"
                onConfirm={(date) => {
                    setFilterDate(date);
                    setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
            />

            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
                {gratitudes.length === 0 && (
                    <Text style={{ color: colors.subtext, textAlign: 'center' }}>아직 감사 나눔이 없어요</Text>
                )}
                {gratitudes.map(item => (
                    <View key={item.id} style={{ backgroundColor: colors.surface, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.md }}>
                        <Text style={{fontSize:font.heading, color: colors.text }}>{item.content}</Text>
                        <Text style={{fontSize:font.body ,color: colors.subtext }}>{item.authorName}</Text>
                    </View>
                ))}
            </ScrollView>

            <Modal visible={writeModalVisible} animationType="slide">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: insets.top + 60 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                                <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text }}>오늘 감사한 일을 작성하세요</Text>
                                <TouchableOpacity onPress={() => setWriteModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                placeholder="소소한 감사한 일을 나눠보세요"
                                placeholderTextColor={colors.subtext}
                                value={content}
                                onChangeText={setContent}
                                multiline
                                scrollEnabled={true} // ✅ 내부 스크롤 가능
                                textAlignVertical="top" // ✅ 내용 위에서부터 시작
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.md,
                                    padding: spacing.md,
                                    minHeight: 120,  // ✅ 최소 높이
                                    maxHeight: 400,  // ✅ 최대 높이 제한
                                    color: colors.text,
                                }}
                            />
                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={{ backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>작성 완료</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
