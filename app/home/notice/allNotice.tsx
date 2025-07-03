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
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, onSnapshot} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';

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
    const allowedRoles = ['교역자', '관리자'];
    const [userRole, setUserRole] = useState<string | null>(null);
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
                    setUser(fresh); // ✅ 실시간 업데이트
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
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                    }}
                >
                    <View
                        style={{
                            backgroundColor: '#fff',
                            width: '90%',
                            borderRadius: 16,
                            padding: 20,
                            elevation: 10,
                            maxHeight: '80%', // 📌 모달 최대 높이 지정
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                            공지사항 추가
                        </Text>

                        {/* 입력 영역 스크롤 */}
                        <ScrollView
                            style={{ flexGrow: 0 }} // ✅ 여기 중요: 스크롤뷰가 전체 채우지 않게
                            contentContainerStyle={{ paddingBottom: 16 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <TextInput
                                placeholder="제목"
                                value={title}
                                onChangeText={setTitle}
                                placeholderTextColor={colors.placeholder}
                                style={{
                                    borderColor: '#ccc',
                                    borderWidth: 1,
                                    borderRadius: 8,
                                    padding: 10,
                                    marginBottom: 10,
                                    backgroundColor: colors.background
                                }}
                            />

                            <TextInput
                                placeholder="내용"
                                placeholderTextColor={colors.placeholder}
                                value={content}
                                onChangeText={setContent}
                                multiline
                                style={{
                                    borderColor: '#ccc',
                                    borderWidth: 1,
                                    borderRadius: 8,
                                    padding: 10,
                                    minHeight: 150,
                                    maxHeight: 300, // ✨ 입력창 크기 제한
                                    textAlignVertical: 'top',
                                    backgroundColor: colors.background
                                }}
                            />
                        </ScrollView>

                        {/* 버튼 */}
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'flex-end',
                                marginTop: 12,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={{ marginRight: 12 }}
                            >
                                <Text style={{ color: '#888' }}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddNotice}>
                                <Text style={{ color: '#2563EB', fontWeight: 'bold' }}>추가</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
