import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    ScrollView, Alert, Platform, Modal, Dimensions
} from 'react-native';
import { db } from '@/firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import { getCurrentUser } from '@/services/authService';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {router} from "expo-router";
const { height } = Dimensions.get('window');

export default function DevotionPage() {
    const [content, setContent] = useState('');
    const [user, setUser] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [allPosts, setAllPosts] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [writeModalVisible, setWriteModalVisible] = useState(false);
    const [filterDate, setFilterDate] = useState<Date | null>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [rankingVisible, setRankingVisible] = useState(false);
    const [rankingData, setRankingData] = useState<any[]>([]);
    const [filterUserName, setFilterUserName] = useState<string | null>(null);
    const theme = useDesign();
    const { colors, spacing, font, radius } = useDesign();
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();
    useEffect(() => {
        getCurrentUser().then(setUser);
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'devotions'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllPosts(data);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let filtered = [...allPosts];

        if (filterDate) {
            const start = new Date(filterDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(filterDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(post => {
                const createdAt = new Date(post.createdAt.seconds * 1000);
                return createdAt >= start && createdAt <= end;
            });
        }

        if (filterUserName) {
            filtered = filtered.filter(post =>
                post.authorName?.toLowerCase().includes(filterUserName.toLowerCase())
            );
        }

        setPosts(filtered);
    }, [filterDate, allPosts, filterUserName]);

    const clearFilters = () => {
        setFilterDate(null);
        setFilterUserName(null);
    };

    const handleSubmit = async () => {
        if (!content.trim() || !user) return;
        try {
            await addDoc(collection(db, 'devotions'), {
                content,
                createdAt: new Date(),
                authorEmail: user.email,
                authorName: user.name,
            });
            setContent('');
            setWriteModalVisible(false);
        } catch (e) {
            Alert.alert('오류', '묵상 내용을 업로드하지 못했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert('삭제 확인', '정말로 이 묵상을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제', style: 'destructive', onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'devotions', id));
                    } catch (e) {
                        Alert.alert('오류', '삭제에 실패했습니다.');
                    }
                }
            }
        ]);
    };

    const handleUpdate = async (id: string) => {
        try {
            await updateDoc(doc(db, 'devotions', id), {
                content: editingContent
            });
            setEditingId(null);
        } catch (e) {
            Alert.alert('오류', '수정에 실패했습니다.');
        }
    };

    const loadRanking = async () => {
        const now = new Date();

        // 1. 이번 주 월요일 00:00 계산
        const monday = new Date(now);
        const day = monday.getDay(); // 일: 0, 월: 1, ..., 토: 6
        const diffToMonday = (day === 0 ? -6 : 1 - day); // 일요일이면 -6, 그 외는 1 - day
        monday.setDate(monday.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0); // 00:00:00.000

        // 2. 이번 주 토요일 23:59:59 계산
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);
        saturday.setHours(23, 59, 59, 999);

        // 3. Firestore 쿼리
        const q = query(
            collection(db, 'devotions'),
            where('createdAt', '>=', monday),
            where('createdAt', '<=', saturday)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => doc.data());

        // 4. 사용자별 개수 세기
        const countMap: Record<string, { count: number, name: string }> = {};
        for (const item of data) {
            const email = item.authorEmail;
            if (!countMap[email]) {
                countMap[email] = { count: 0, name: item.authorName };
            }
            countMap[email].count++;
        }

        // 5. 랭킹 정렬 및 상위 5명 선택
        const sorted = Object.entries(countMap)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([email, val]) => ({ email, ...val }));

        setRankingData(sorted);
        setRankingVisible(true);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop:Platform.OS === 'android' ? insets.top : insets.top-10}}>
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: spacing.lg,
                    paddingTop: Platform.OS === 'android' ? insets.top + spacing.sm : spacing.xl,
                    paddingBottom: spacing.md,
                    backgroundColor: colors.background,
                }}
            >
                {/* ← 화살표 + 제목 */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} style={{ marginRight: spacing.sm }} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>
                        📝 매일 묵상
                    </Text>
                </View>

                {/* 오른쪽 아이콘들 */}
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    <TouchableOpacity onPress={loadRanking}>
                        <Ionicons name="trophy-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setWriteModalVisible(true)}>
                        <Ionicons name="create-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

             {/*🧑 유저 이름 필터 입력창 */}
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
                <TextInput
                    placeholder="작성자 이름으로 검색"
                    placeholderTextColor={colors.subtext}
                    value={filterUserName || ''}
                    onChangeText={text => setFilterUserName(text.trim() === '' ? null : text.trim())}
                    style={{
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: radius.md,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        color: colors.text,
                    }}
                />
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={filterDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) setFilterDate(date);
                    }}
                />
            )}

            {(filterDate || filterUserName) && (
                <TouchableOpacity onPress={clearFilters} style={{ alignSelf: 'flex-end', paddingRight: spacing.lg }}>
                    <Text style={{ color: colors.subtext }}>필터 해제</Text>
                </TouchableOpacity>
            )}

            <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
                {posts.length === 0 && (
                    <Text style={{ color: colors.subtext, textAlign: 'center', marginVertical: spacing.xl }}>오늘은 아직 묵상이 없어요</Text>
                )}

                {posts.map(post => (
                    <View key={post.id} style={{ marginBottom: spacing.xl, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, maxHeight: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3
                    }}>
                        <Text style={{ color: colors.subtext, marginBottom: 4 }}>{post.authorName} ・ {new Date(post.createdAt.seconds * 1000).toLocaleDateString()}</Text>
                        {editingId === post.id ? (
                            <>
                                <TextInput
                                    value={editingContent}
                                    onChangeText={setEditingContent}
                                    multiline
                                    style={{
                                        borderColor: colors.border,
                                        borderWidth: 1,
                                        borderRadius: radius.sm,
                                        padding: spacing.sm,
                                        minHeight: 100,
                                        color: colors.text,
                                        marginBottom: spacing.sm
                                    }}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
                                    <TouchableOpacity onPress={() => setEditingId(null)}>
                                        <Text style={{ color: colors.subtext }}>취소</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleUpdate(post.id)}>
                                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>저장</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={{ color: colors.text, lineHeight: 20, marginBottom: spacing.sm }}>{post.content}</Text>
                                {user?.email === post.authorEmail && (
                                    <View style={{ flexDirection: 'row',
                                        justifyContent: 'flex-end',
                                        gap: spacing.sm,}}>
                                        <TouchableOpacity onPress={() => {
                                            setEditingId(post.id);
                                            setEditingContent(post.content);
                                        }}>
                                            <Text style={{ color: colors.primary }}>수정</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDelete(post.id)}>
                                            <Text style={{ color: colors.error }}>삭제</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                ))}
            </ScrollView>

            <Modal visible={writeModalVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 40 : 150, paddingHorizontal: spacing.lg }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                        <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text }}>✍️ 오늘의 묵상 작성</Text>
                        <TouchableOpacity onPress={() => setWriteModalVisible(false)}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        placeholder="오늘의 묵상 내용을 입력하세요"
                        placeholderTextColor={colors.subtext}
                        value={content}
                        onChangeText={setContent}
                        multiline
                        style={{
                            borderColor: colors.border,
                            borderWidth: 1,
                            borderRadius: radius.md,
                            padding: spacing.md,
                            minHeight: 150,
                            color: colors.text,
                            marginBottom: spacing.md
                        }}
                    />

                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={{ backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>작성 완료</Text>
                    </TouchableOpacity>
                </View>
            </Modal>


            <Modal visible={rankingVisible} animationType="slide" transparent>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <View style={{ width: '85%', maxHeight: height * 0.6, backgroundColor: colors.background, padding: spacing.lg, borderRadius: radius.lg }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                            <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>🏆 묵상 랭킹 (최근 7일)</Text>
                            <TouchableOpacity onPress={() => setRankingVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {rankingData.length === 0 ? (
                            <Text style={{ color: colors.subtext }}>랭킹 데이터가 없습니다.</Text>
                        ) : (
                            rankingData.map((item, index) => (
                                <TouchableOpacity
                                    key={item.email}
                                    onPress={() => {
                                        setRankingVisible(false);
                                    }}
                                    style={{ marginBottom: spacing.md }}
                                >
                                    <Text style={{ color: colors.text }}>{index + 1}. {item.name} - {item.count}회</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
