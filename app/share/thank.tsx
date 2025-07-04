// pages/gratitude/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, TextInput, Modal,
    KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
    Dimensions, PanResponder, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    updateDoc,
    doc,
    serverTimestamp,
    deleteDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';

const { height } = Dimensions.get('window');

type Gratitude = {
    authorEmail: string;
    id: string;
    content: string;
    authorId?: string;
    authorName?: string;
    createdAt: {
        seconds: number;
        nanoseconds: number;
    };
};

export default function ThanksPage() {
    const [gratitudes, setGratitudes] = useState<Gratitude[]>([]);
    const [filterDate, setFilterDate] = useState<Date>(new Date());
    const [content, setContent] = useState('');
    const [writeModalVisible, setWriteModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

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
                createdAt: serverTimestamp(),
                authorEmail: user.email,      // ✅ 이메일 저장
                authorName: user.name ?? '익명',
            });
            setContent('');
            setWriteModalVisible(false);
        } catch (e) {
            console.error('작성 오류', e);
        }
    };

    const handleUpdate = async (id: string) => {
        try {
            await updateDoc(doc(db, 'gratitudes', id), {
                content: editContent,
                updatedAt: serverTimestamp(),
            });
            setEditingId(null);
        } catch (e) {
            console.error('수정 실패:', e);
            Alert.alert('수정 실패', '글 수정 중 오류가 발생했습니다.');
        }
    };

    const handleDelete = async (id: string, authorId?: string) => {
        if (authorId !== user?.uid) {
            Alert.alert('삭제 권한 없음', '본인 글만 삭제할 수 있습니다.');
            return;
        }
        Alert.alert('삭제 확인', '정말 이 글을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'gratitudes', id));
                    } catch (e) {
                        console.error('삭제 실패:', e);
                        Alert.alert('삭제 실패', '글 삭제 중 오류가 발생했습니다.');
                    }
                },
            },
        ]);
    };

    return (
        <View
            style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top : insets.top }}
            {...panResponder.panHandlers} // 💥 전체 화면 스와이프
        >
            {/* 상단 헤더 */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: spacing.lg
            }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>🙏 오늘의 감사나눔</Text>
                <TouchableOpacity onPress={() => setWriteModalVisible(true)}>
                    <Ionicons name="create-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* 날짜 선택 */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginBottom: spacing.md
            }}>
                <TouchableOpacity
                    onPress={() => setFilterDate(prev => {
                        const newDate = new Date(prev);
                        newDate.setDate(newDate.getDate() - 1);
                        return newDate;
                    })}
                    style={{ padding: 8, marginRight: 16 }}
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
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                        {format(filterDate, 'yyyy-MM-dd')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setFilterDate(prev => {
                        const newDate = new Date(prev);
                        newDate.setDate(newDate.getDate() + 1);
                        return newDate;
                    })}
                    style={{ padding: 8, marginLeft: 16 }}
                >
                    <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* 감사 나눔 리스트 */}
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
                keyboardShouldPersistTaps="handled"
            >
                {gratitudes.length === 0 && (
                    <Text style={{ color: colors.subtext, textAlign: 'center' }}>아직 감사 나눔이 없어요</Text>
                )}
                {gratitudes.map(item => {
                    const isMyPost = item.authorEmail === user?.email;

                    return (
                        <View
                            key={item.id}
                            style={{
                                backgroundColor: colors.surface,
                                marginBottom: spacing.md,
                                padding: spacing.md,
                                borderRadius: radius.md,
                            }}
                        >
                            {/* 본문 */}
                            {editingId === item.id ? (
                                <TextInput
                                    value={editContent}
                                    onChangeText={setEditContent}
                                    multiline
                                    style={{
                                        borderColor: colors.border,
                                        borderWidth: 1,
                                        borderRadius: radius.sm,
                                        padding: spacing.sm,
                                        color: colors.text,
                                        marginBottom: spacing.sm,
                                    }}
                                />
                            ) : (
                                <Text style={{ fontSize: font.heading, color: colors.text }}>
                                    {item.content}
                                </Text>
                            )}

                            {/* 작성자 표시 */}
                            <Text style={{ fontSize: font.body, color: colors.subtext }}>
                                {item.authorName}
                            </Text>

                            {/* 본인 글일 때만 버튼 */}
                            {isMyPost && (
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }}>
                                    {editingId === item.id ? (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => handleUpdate(item.id)}
                                                style={{ marginRight: spacing.sm }}
                                            >
                                                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>저장</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => setEditingId(null)}>
                                                <Text style={{ color: colors.subtext }}>취소</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setEditingId(item.id);
                                                    setEditContent(item.content);
                                                }}
                                                style={{ marginRight: spacing.sm }}
                                            >
                                                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>수정</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                                <Text style={{ color: 'red', fontWeight: 'bold' }}>삭제</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>


            {/* 작성 모달 */}
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
                                scrollEnabled={true}
                                textAlignVertical="top"
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.md,
                                    padding: spacing.md,
                                    minHeight: 120,
                                    maxHeight: 400,
                                    color: colors.text,
                                }}
                            />
                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={{
                                    backgroundColor: colors.primary,
                                    padding: spacing.md,
                                    borderRadius: radius.md,
                                    marginTop: spacing.lg,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>작성 완료</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
