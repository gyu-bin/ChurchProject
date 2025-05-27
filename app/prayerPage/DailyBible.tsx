import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Toast from "react-native-root-toast";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// 위치에 맞게 경로 수정

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
    const { showRanking } = useLocalSearchParams<{ showRanking?: string }>();
    const [rankingVisible, setRankingVisible] = useState(false);
    const [rankingData, setRankingData] = useState<any[]>([]);
    const [filterUserName, setFilterUserName] = useState<string | null>(null);
    const theme = useDesign();
    const { colors, spacing, font, radius } = useDesign();
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();
    const [rankingRangeText, setRankingRangeText] = useState<string>(''); // 📅 날짜 표시용 추가

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 20;
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx > 50) {
                    // ➡️ 오른쪽 → 전날
                    setFilterDate(prev => {
                        const newDate = new Date(prev ?? new Date());
                        newDate.setDate(newDate.getDate() - 1);
                        return newDate;
                    });
                } else if (gestureState.dx < -50) {
                    // ⬅️ 왼쪽 → 다음날
                    setFilterDate(prev => {
                        const newDate = new Date(prev ?? new Date());
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
        if (showRanking === 'true') {
            setRankingVisible(true);
        }
    }, [showRanking]);

    useEffect(() => {
        if (showRanking === 'true') {
            loadRanking();
            setRankingVisible(true);
        }
    }, [showRanking]);


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
            Toast.show('✅ 수정되었습니다.', {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
            });

        } catch (e) {
            Alert.alert('오류', '수정에 실패했습니다.');
        }
    };

    const loadRanking = async () => {
        const now = new Date();

        // ✅ 이번 주 월요일 계산 (일요일이면 지난 월요일로)
        const monday = new Date(now);
        const day = monday.getDay(); // 0(일) ~ 6(토)
        const diffToMonday = (day === 0 ? -6 : 1 - day); // 일요일(-6), 월요일(0), 화(-1) ...
        monday.setDate(monday.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        // ✅ 이번 주 토요일 계산
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);
        saturday.setHours(23, 59, 59, 999);

        // 📅 날짜 범위 문자열 저장 (ex. 2025-05-13 ~ 2025-05-18)
        const formattedRange = `${format(monday, 'yyyy-MM-dd')} ~ ${format(saturday, 'yyyy-MM-dd')}`;
        setRankingRangeText(formattedRange);

        // ✅ 월~토 데이터만 집계
        const q = query(
            collection(db, 'devotions'),
            where('createdAt', '>=', monday),
            where('createdAt', '<=', saturday)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => doc.data());

        // ✅ 사용자별 묵상 횟수 계산
        const countMap: Record<string, { count: number, name: string }> = {};
        for (const item of data) {
            const email = item.authorEmail;
            if (!countMap[email]) {
                countMap[email] = { count: 0, name: item.authorName };
            }
            countMap[email].count++;
        }

        // ✅ 상위 5명 추출
        const sorted = Object.entries(countMap)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([email, val]) => ({ email, ...val }));

        setRankingData(sorted);
        setRankingVisible(true);
    };

    const handleDateConfirm = (date: Date) => {
        setShowDatePicker(false);
        if (date) setFilterDate(date);
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
                <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                    {/* 날짜 */}
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ alignItems: 'center' }}>
                        <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>날짜</Text>
                    </TouchableOpacity>

                    {/* 랭킹 */}
                    <TouchableOpacity onPress={loadRanking} style={{ alignItems: 'center' }}>
                        <Ionicons name="trophy-outline" size={24} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>랭킹</Text>
                    </TouchableOpacity>

                    {/* 작성 */}
                    <TouchableOpacity onPress={() => setWriteModalVisible(true)} style={{ alignItems: 'center' }}>
                        <Ionicons name="create-outline" size={24} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>작성</Text>
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

            {/* 날짜 선택기 */}
            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                onConfirm={handleDateConfirm}
                onCancel={() => setShowDatePicker(false)}
                display="inline"
            />

            {(filterDate || filterUserName) && (
                <TouchableOpacity onPress={clearFilters} style={{ alignSelf: 'flex-end', paddingRight: spacing.lg }}>
                    <Text style={{ color: colors.subtext }}>필터 해제</Text>
                </TouchableOpacity>
            )}


            <View {...panResponder.panHandlers} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingLeft: spacing.lg,paddingRight: spacing.lg,paddingBottom: spacing.lg }}>
                <View style={{ alignItems: 'center', marginVertical: 16, flexDirection: 'row', justifyContent: 'center' }}>
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

                {posts.length === 0 && (
                    <Text style={{ color: colors.subtext, textAlign: 'center', marginVertical: spacing.xl }}>오늘은 아직 묵상이 없어요</Text>
                )}

                {posts.map(post => (
                    <View
                        key={post.id}
                        style={{
                            marginBottom: spacing.xl,
                            backgroundColor: theme.colors.surface,
                            borderRadius: theme.radius.lg,
                            padding: theme.spacing.md,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 6,
                            elevation: 3,
                        }}
                    >
                        {/* 상단 헤더: 이름 + 날짜 + 수정/삭제 */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            {/* 작성자 · 날짜 */}
                            <Text style={{ color: colors.subtext }}>
                                {post.authorName} ・ {new Date(post.createdAt.seconds * 1000).toLocaleDateString()}
                            </Text>

                            {/* 수정/삭제 버튼 (본인 글만 노출) */}
                            {user?.email === post.authorEmail && editingId !== post.id && (
                                <View style={{ flexDirection: 'row', gap: 12 }}>
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
                        </View>

                        {/* 본문 or 수정 중 */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={{ flex: 1 }}
                        >
                            <ScrollView
                                contentContainerStyle={{ padding: spacing.md }}
                                keyboardShouldPersistTaps="handled"
                            >
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
                                                marginBottom: spacing.sm,
                                                textAlignVertical: 'top', // ✅ 멀티라인 입력 시 위 정렬
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
                                    <Text style={{ color: colors.text, lineHeight: 20 }}>{post.content}</Text>
                                )}
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                ))}
            </ScrollView>
        </View>
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
                <View style={{ 
                    flex: 1, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)' 
                }}>
                    <View style={{ 
                        width: '85%', 
                        maxHeight: height * 0.85, 
                        backgroundColor: colors.background, 
                        padding: spacing.lg, 
                        borderRadius: radius.lg,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5
                    }}>
                        <Text style={{ 
                            color: colors.subtext, 
                            fontSize: 14, 
                            marginBottom: spacing.sm 
                        }}>
                            📅 집계 기간: {rankingRangeText}
                        </Text>
                        
                        <View style={{ 
                            flexDirection: 'row', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: spacing.lg 
                        }}>
                            <Text style={{ 
                                fontSize: font.heading, 
                                fontWeight: 'bold', 
                                color: colors.text 
                            }}>
                                🏆 이번 주 묵상 랭킹
                            </Text>
                            <TouchableOpacity onPress={() => setRankingVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {rankingData.length === 0 ? (
                            <View style={{ alignItems: 'center', padding: spacing.xl }}>
                                <Text style={{ color: colors.subtext, marginBottom: spacing.md }}>
                                    아직 이번 주 묵상 데이터가 없습니다
                                </Text>
                                <Text style={{ color: colors.subtext, fontSize: 12 }}>
                                    매일 묵상을 작성하고 랭킹에 도전해보세요!
                                </Text>
                            </View>
                        ) : (
                            rankingData.map((item, index) => (
                                <View
                                    key={item.email}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: colors.surface,
                                        padding: spacing.md,
                                        marginBottom: spacing.sm,
                                        borderRadius: radius.md,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 2,
                                        elevation: 2
                                    }}
                                >
                                    <Text style={{ 
                                        fontSize: 24, 
                                        marginRight: spacing.md 
                                    }}>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                                    </Text>
                                    <View>
                                        <Text style={{ 
                                            fontSize: font.body, 
                                            fontWeight: 'bold',
                                            color: colors.text 
                                        }}>
                                            {item.name}
                                        </Text>
                                        <Text style={{ 
                                            fontSize: font.caption, 
                                            color: colors.subtext 
                                        }}>
                                            이번 주 {item.count}회 작성
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
