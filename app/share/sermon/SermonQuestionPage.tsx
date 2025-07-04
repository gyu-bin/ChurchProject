import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert,
    Modal, TextInput, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import { getCurrentUser } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';

export default function SermonQuestionPage() {
    const { colors, spacing, font, radius } = useDesign();
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState('');
    const [user, setUser] = useState<any>(null);
    const [anonymous, setAnonymous] = useState(false);
    const router = useRouter();

    useEffect(() => {
        getCurrentUser().then(setUser);
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'sermon_questions'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setQuestions(data);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const resetForm = () => {
        setContent('');
        setAuthor('');
        setSelectedQuestion(null);
    };

    const handleSave = async () => {
        if (!content) {
            Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
            return;
        }

        const payload = {
            content,
            author: anonymous ? '익명' : user?.name || '익명',
            userEmail: user?.email,
            createdAt: serverTimestamp(),
        };

        try {
            if (selectedQuestion) {
                await updateDoc(doc(db, 'sermon_questions', selectedQuestion.id), payload);
            } else {
                await addDoc(collection(db, 'sermon_questions'), payload);
            }
            resetForm();
            setModalVisible(false);
        } catch (e) {
            console.error('저장 오류:', e);
            Alert.alert('오류', '저장 중 문제가 발생했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'sermon_questions', id));
                    } catch (e) {
                        console.error('삭제 오류:', e);
                        Alert.alert('삭제 실패', '질문 삭제 중 문제가 발생했습니다.');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => {
        const isMyPost = user?.email === item.userEmail;

        return (
            <TouchableOpacity
                onPress={() => router.push(`/share/sermon/sermonQustionDeatil?id=${item.id}`)}
                style={{
                    backgroundColor: colors.surface,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    borderRadius: spacing.sm,
                    borderWidth: 1,
                    borderColor: colors.border
                }}
            >
                <Text style={{ fontWeight: 'bold', color: colors.text, fontSize: font.body }}>
                    {item.content}
                </Text>
                <Text style={{ color: colors.subtext, marginTop: spacing.xs }}>
                    {item.author}
                </Text>
                {isMyPost && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }}>
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedQuestion(item);
                                setContent(item.content);
                                setAuthor(item.author);
                                setModalVisible(true);
                            }}
                            style={{ marginRight: spacing.sm }}
                        >
                            <Text style={{fontSize:15, color: colors.primary, fontWeight: 'bold' }}>수정</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)}>
                            <Text style={{ fontSize:15,color: 'red', fontWeight: 'bold' }}>삭제</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.md }}>
            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} />
            ) : (
                <FlatList
                    data={questions}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* ➕ 플로팅 버튼 */}
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={{
                    position: 'absolute',
                    bottom: spacing.lg,
                    right: spacing.lg,
                    backgroundColor: colors.primary,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderRadius: 32,
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ 질문</Text>
            </TouchableOpacity>

            {/* 📌 Apple 스타일 중간 모달 */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => { setModalVisible(false); resetForm(); }}
                statusBarTranslucent
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        justifyContent: 'flex-end',
                    }}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{
                                backgroundColor: colors.surface,
                                borderTopLeftRadius: radius.lg * 2,
                                borderTopRightRadius: radius.lg * 2,
                                paddingHorizontal: spacing.lg,
                                paddingTop: spacing.md,
                                paddingBottom: spacing.lg + 20,
                                minHeight: '70%',
                            }}
                        >
                            {/* 드래그 핸들 */}
                            <View style={{
                                alignItems: 'center',
                                marginBottom: spacing.md,
                            }}>
                                <View style={{
                                    width: 40,
                                    height: 5,
                                    borderRadius: 3,
                                    backgroundColor: '#ccc',
                                }} />
                            </View>

                            {/* 헤더 */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: spacing.md,
                            }}>
                                <Text style={{
                                    fontSize: font.title,
                                    fontWeight: 'bold',
                                    color: colors.text,
                                }}>
                                    {selectedQuestion ? '✏️ 질문 수정' : '❓ 질문 작성'}
                                </Text>
                                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* 질문 내용 입력 */}
                            <TextInput
                                placeholder="질문 내용"
                                placeholderTextColor={colors.subtext}
                                value={content}
                                onChangeText={setContent}
                                multiline
                                textAlignVertical="top"
                                scrollEnabled // 💥 내용 스크롤 가능
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.md,
                                    padding: spacing.md,
                                    height: 200,
                                    color: colors.text,
                                    backgroundColor: colors.surface,
                                }}
                            />

                            {/* ✅ 익명 선택 버튼 */}
                            <TouchableOpacity
                                onPress={() => setAnonymous(prev => !prev)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingTop: spacing.lg
                                }}
                            >
                                <View
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderWidth: 2,
                                        borderColor: anonymous ? colors.primary : colors.border, // ✅ 선택 시 primary
                                        backgroundColor: anonymous ? colors.primary : colors.surface, // ✅ 선택 시 filled
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12,
                                        borderRadius: 6, // ✅ 둥글게 (iOS 스타일)
                                        shadowColor: '#000',
                                        shadowOpacity: anonymous ? 0.2 : 0, // ✅ 선택 시 약간 그림자
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowRadius: 3,
                                        elevation: anonymous ? 3 : 0, // ✅ Android 그림자
                                    }}
                                >
                                    {anonymous && (
                                        <Ionicons
                                            name="checkmark"
                                            size={16}
                                            color="#fff" // ✅ 선택 시 체크는 흰색
                                        />
                                    )}
                                </View>
                                <Text style={{ fontSize: font.body, color: colors.text }}>
                                    익명으로 질문하기
                                </Text>
                            </TouchableOpacity>

                            {/* 완료 버튼 */}
                            <TouchableOpacity
                                onPress={handleSave}
                                style={{
                                    backgroundColor: colors.primary,
                                    padding: spacing.md,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                    marginTop: spacing.lg,
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>완료</Text>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}
