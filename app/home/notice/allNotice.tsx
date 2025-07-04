import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    Modal,
    Alert,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NoticeItem {
    id: string;
    title: string;
    content: string;
    date?: {
        seconds: number;
        nanoseconds: number;
    };
}

export default function NoticePage() {
    const [user, setUser] = useState<any>(null);
    const [notices, setNotices] = useState<NoticeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const { colors, spacing, font } = useDesign();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        let unsubscribe: () => void;

        const listenUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (!raw) return;
            const cachedUser = JSON.parse(raw);
            const userRef = doc(db, 'users', cachedUser.email);

            unsubscribe = onSnapshot(userRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const fresh = { ...docSnap.data(), email: cachedUser.email };
                    setUser(fresh);
                    await AsyncStorage.setItem('currentUser', JSON.stringify(fresh));
                }
            });
        };

        listenUser();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const fetchNotices = async () => {
        try {
            const q = query(collection(db, 'notice'), where('type', '==', 'notice'));
            const snapshot = await getDocs(q);
            const fetched: NoticeItem[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as NoticeItem[];
            setNotices(fetched);
        } catch (e) {
            console.error('❌ 공지 불러오기 실패:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    const handleAddNotice = async () => {
        if (!title || !content) {
            Alert.alert('입력 오류', '제목과 내용을 모두 입력해주세요.');
            return;
        }

        try {
            await addDoc(collection(db, 'notice'), {
                title,
                content,
                type: 'notice',
                date: serverTimestamp(),
            });

            setTitle('');
            setContent('');
            setModalVisible(false);
            fetchNotices();
        } catch (e) {
            Alert.alert('등록 실패', '공지사항 등록 중 오류가 발생했습니다.');
            console.error(e);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top : insets.top }}>
            {/* ✅ 상단 헤더 */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>공지사항</Text>

                {user?.role === '교역자' || user?.role === '관리자' ? (
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={26} color={colors.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 26 }} />
                )}
            </View>

            {/* ✅ 공지사항 목록 */}
            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                    {notices.length > 0 ? (
                        notices.map(item => {
                            const formattedDate = item.date?.seconds
                                ? new Date(item.date.seconds * 1000).toLocaleDateString('ko-KR')
                                : '';

                            return (
                                <View
                                    key={item.id}
                                    style={{
                                        backgroundColor: colors.surface,
                                        borderRadius: 12,
                                        padding: spacing.md,
                                        marginBottom: spacing.sm,
                                        shadowColor: '#000',
                                        shadowOpacity: 0.05,
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <Text
                                            style={{
                                                backgroundColor: '#E3F2FD',
                                                color: '#1976D2',
                                                fontSize: 11,
                                                fontWeight: 'bold',
                                                paddingHorizontal: 6,
                                                paddingVertical: 2,
                                                borderRadius: 4,
                                                marginRight: 6,
                                            }}
                                        >
                                            공지사항
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors.subtext }}>{formattedDate}</Text>
                                    </View>
                                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                                        {item.title}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: colors.subtext }}>{item.content}</Text>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={{ color: colors.subtext, textAlign: 'center' }}>공지사항이 없습니다.</Text>
                    )}
                </ScrollView>
            )}

            {/* ✅ 공지사항 추가 모달 */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1, backgroundColor: colors.background,paddingTop: Platform.OS === 'android' ? insets.top : insets.top }}>
                            {/* ✅ 상단 헤더 */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingHorizontal: spacing.lg,
                                    paddingVertical: spacing.md,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: font.heading,
                                        fontWeight: 'bold',
                                        color: colors.text,
                                    }}
                                >
                                    📝 공지사항 작성
                                </Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={26} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* ✅ 입력 영역 */}
                            <View style={{ flex: 1, padding: spacing.lg }}>
                                <TextInput
                                    placeholder="공지 제목을 입력하세요"
                                    placeholderTextColor={colors.placeholder}
                                    value={title}
                                    onChangeText={setTitle}
                                    style={{
                                        borderColor: colors.border,
                                        borderWidth: 1,
                                        borderRadius: 10,
                                        padding: spacing.md,
                                        fontSize: font.body,
                                        marginBottom: spacing.md,
                                        backgroundColor: colors.surface,
                                        color: colors.text,
                                    }}
                                />
                                <TextInput
                                    placeholder="공지 내용을 입력하세요"
                                    placeholderTextColor={colors.placeholder}
                                    value={content}
                                    onChangeText={setContent}
                                    multiline
                                    textAlignVertical="top"
                                    style={{
                                        borderColor: colors.border,
                                        borderWidth: 1,
                                        borderRadius: 10,
                                        padding: spacing.md,
                                        fontSize: font.body,
                                        minHeight: 180,
                                        backgroundColor: colors.surface,
                                        color: colors.text,
                                    }}
                                />
                            </View>

                            {/* ✅ 하단 버튼 */}
                            <View style={{ padding: spacing.lg }}>
                                <TouchableOpacity
                                    onPress={handleAddNotice}
                                    style={{
                                        backgroundColor: colors.primary,
                                        borderRadius: 10,
                                        paddingVertical: spacing.md,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>
                                        작성 완료
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
