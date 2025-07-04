import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal,
    KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import { getCurrentUser } from '@/services/authService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

dayjs.extend(relativeTime);

export default function SermonSharePage() {
    const { colors, spacing, font, radius } = useDesign();
    const [shares, setShares] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [title, setTitle] = useState('');
    const [preacher, setPreacher] = useState('');
    const [content, setContent] = useState('');
    const [user, setUser] = useState<any>(null);

    const insets = useSafeAreaInsets();
    const router = useRouter();

    useEffect(() => {
        getCurrentUser().then(setUser);
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'sermon_shares'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setShares(data);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const handleAddShare = async () => {
        if (!title || !content || !preacher) {
            Alert.alert('입력 오류', '모든 항목을 입력하세요.');
            return;
        }

        try {
            await addDoc(collection(db, 'sermon_shares'), {
                title,
                preacher,
                content,
                userEmail: user?.email,
                createdAt: serverTimestamp(),
            });
            resetForm();
            setModalVisible(false);
        } catch (e) {
            console.error('등록 실패:', e);
            Alert.alert('등록 실패', '나눔 등록 중 오류가 발생했습니다.');
        }
    };

    const handleUpdateShare = async () => {
        if (!title || !content || !preacher || !selectedPost) return;

        try {
            await updateDoc(doc(db, 'sermon_shares', selectedPost.id), {
                title,
                preacher,
                content,
                updatedAt: serverTimestamp(),
            });
            resetForm();
            setEditModalVisible(false);
        } catch (e) {
            console.error('수정 실패:', e);
            Alert.alert('수정 실패', '글 수정 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteShare = async (id: string) => {
        Alert.alert('삭제 확인', '정말 이 글을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'sermon_shares', id));
                    } catch (e) {
                        console.error('삭제 실패:', e);
                        Alert.alert('삭제 실패', '글 삭제 중 오류가 발생했습니다.');
                    }
                },
            },
        ]);
    };

    const resetForm = () => {
        setTitle('');
        setPreacher('');
        setContent('');
        setSelectedPost(null);
    };

    const isMyPost = (item: any) => item.userEmail === user?.email;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: spacing.md }}>
            {loading ? (
                <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.lg }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
                    keyboardShouldPersistTaps="handled"
                >
                    {shares.map((item) => (
                        <View
                            key={item.id}
                            style={{
                                backgroundColor: colors.surface,
                                padding: 16,
                                marginBottom: 12,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: colors.border
                            }}
                        >
                            <Text style={{ fontWeight: 'bold', fontSize: font.body, color: colors.text }}>
                                {item.title}
                            </Text>
                            <Text style={{ color: colors.subtext, marginBottom: spacing.xs }}>
                                {item.preacher}
                                {/*• {dayjs(item.createdAt?.seconds * 1000).fromNow()}*/}
                            </Text>
                            <Text style={{ color: colors.text, marginBottom: spacing.xs }}>
                                {item.content}
                            </Text>

                            {isMyPost(item) && (
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSelectedPost(item);
                                            setTitle(item.title);
                                            setPreacher(item.preacher);
                                            setContent(item.content);
                                            setEditModalVisible(true);
                                        }}
                                        style={{ marginRight: spacing.sm }}
                                    >
                                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>수정</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteShare(item.id)}>
                                        <Text style={{ color: 'red', fontWeight: 'bold' }}>삭제</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* ➕ 플로팅 버튼 */}
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderRadius: 32,
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ 나눔</Text>
            </TouchableOpacity>

            {/* 작성 모달 */}
            <CenteredModal
                visible={modalVisible}
                onClose={() => { setModalVisible(false); resetForm(); }}
                onSubmit={handleAddShare}
                title={title}
                setTitle={setTitle}
                preacher={preacher}
                setPreacher={setPreacher}
                content={content}
                setContent={setContent}
                heading="✍️ 나눔 작성"
            />

            {/* 수정 모달 */}
            <CenteredModal
                visible={editModalVisible}
                onClose={() => { setEditModalVisible(false); resetForm(); }}
                onSubmit={handleUpdateShare}
                title={title}
                setTitle={setTitle}
                preacher={preacher}
                setPreacher={setPreacher}
                content={content}
                setContent={setContent}
                heading="✏️ 나눔 수정"
            />
        </View>
    );
}

function CenteredModal({
                           visible, onClose, onSubmit, title, setTitle, preacher, setPreacher, content, setContent, heading
                       }: any) {
    const { colors, spacing, font, radius } = useDesign();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    justifyContent: 'flex-end', // ✅ Apple 시트 스타일
                }}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{
                            backgroundColor: colors.surface,
                            borderTopLeftRadius: radius.lg * 2,
                            borderTopRightRadius: radius.lg * 2,
                            paddingHorizontal: spacing.lg,
                            paddingTop: spacing.md,
                            paddingBottom: spacing.lg + 20, // SafeArea 대응
                            minHeight: '70%', // ✅ 높이 제한
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
                                {heading}
                            </Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* 입력 필드 */}
                        <TextInput
                            placeholder="제목"
                            placeholderTextColor={colors.subtext}
                            value={title}
                            onChangeText={setTitle}
                            style={{
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: radius.md,
                                padding: spacing.md,
                                marginBottom: spacing.sm,
                                color: colors.text,
                                backgroundColor: colors.surface,
                            }}
                        />
                        <TextInput
                            placeholder="설교자"
                            placeholderTextColor={colors.subtext}
                            value={preacher}
                            onChangeText={setPreacher}
                            style={{
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: radius.md,
                                padding: spacing.md,
                                marginBottom: spacing.sm,
                                color: colors.text,
                                backgroundColor: colors.surface,
                            }}
                        />
                        <TextInput
                            placeholder="내용"
                            placeholderTextColor={colors.subtext}
                            value={content}
                            onChangeText={setContent}
                            multiline
                            textAlignVertical="top"
                            scrollEnabled
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

                        {/* 완료 버튼 */}
                        <TouchableOpacity
                            onPress={onSubmit}
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
    );
}
