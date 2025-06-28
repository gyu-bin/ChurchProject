// screens/DepartmentsScreen.tsx

import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, {useEffect, useRef, useState} from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {setScrollCallback} from "@/utils/scrollRefManager";

const CAMPUS_DIVISIONS: Record<string, string[]> = {
    신촌캠퍼스: ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'],
    문래캠퍼스: ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'],
    시선교회: ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'],
};

const SCREEN_WIDTH = Dimensions.get('window').width;

const CAMPUSES = ['전체', '신촌캠퍼스', '문래캠퍼스', '시선교회'];
const DEPARTMENTS = ['전체', '유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'];
const FEED_COLORS = ['#a1c4fd', '#fbc2eb', '#fddb92', '#f6d365', '#84fab0', '#fccb90', '#e0c3fc'];
const WRITERS = ['홍길동', '김영희', '이철수', '박민수', '최지은', '정수빈'];
const CONTENTS = [
  '오늘 모임 너무 즐거웠어요! 모두 수고하셨습니다.',
  '다음 주 일정은 어떻게 되나요?',
  '새로운 친구가 왔어요! 환영해주세요.',
  '기도제목 있으신 분 댓글로 남겨주세요!',
  '이번 주는 야외예배입니다!',
  '맛있는 간식 감사합니다 :)',
  '다들 건강 조심하세요~',
];
const TIMES = ['2시간 전', '5분 전', '1일 전', '30분 전', '3일 전', '1주 전'];
const FEED_DEPTS = [
  { name: '유치부', campus: '신촌캠퍼스' },
  { name: '초등부', campus: '신촌캠퍼스' },
  { name: '중고등부', campus: '문래캠퍼스' },
  { name: '청년1부', campus: '문래캠퍼스' },
  { name: '청년2부', campus: '시선교회' },
  { name: '장년부', campus: '시선교회' },
];
// 샘플 피드 20개 랜덤 생성
const FEEDS = Array.from({ length: 100 }).map((_, i) => {
  const dept = FEED_DEPTS[Math.floor(Math.random() * FEED_DEPTS.length)];
  return {
    id: `feed-${i}`,
    dept: dept.name,
    campus: dept.campus,
    color: FEED_COLORS[i % FEED_COLORS.length],
    writer: WRITERS[Math.floor(Math.random() * WRITERS.length)],
    time: TIMES[Math.floor(Math.random() * TIMES.length)],
    content: CONTENTS[Math.floor(Math.random() * CONTENTS.length)],
  };
});

export default function DepartmentsScreen() {
    const [filterModal, setFilterModal] = useState(false);
    const [selectedCampus, setSelectedCampus] = useState('전체');
    const [selectedDept, setSelectedDept] = useState('전체');
    const [tempCampus, setTempCampus] = useState(selectedCampus);
    const [tempDept, setTempDept] = useState(selectedDept);
    const [visibleCount, setVisibleCount] = useState(5);
    const [loadingMore, setLoadingMore] = useState(false);
    const router = useRouter();
    const { mode } = useAppTheme();
    const { colors, font, spacing, radius } = useDesign();
    const isDark = mode === 'dark';

    const slideX = useRef(new Animated.Value(0)).current;

    const campuses = Object.keys(CAMPUS_DIVISIONS);

    const insets = useSafeAreaInsets();
    const mainListRef = useRef<FlatList>(null);
    const filtered = FEEDS.filter(f =>
        (selectedCampus === '전체' || f.campus === selectedCampus) &&
        (selectedDept === '전체' || f.dept === selectedDept)
    );
    const visibleFeeds = filtered.slice(0, visibleCount);

    useEffect(() => {
        setScrollCallback('departments', () => {
            mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
    }, []);

    const openFilter = () => {
        setTempCampus(selectedCampus);
        setTempDept(selectedDept);
        setFilterModal(true);
    };
    const applyFilter = () => {
        setSelectedCampus(tempCampus);
        setSelectedDept(tempDept);
        setVisibleCount(5);
        setFilterModal(false);
    };
    const resetFilter = () => {
        setTempCampus('전체');
        setTempDept('전체');
    };

    const handleLoadMore = () => {
        if (loadingMore) return;
        if (visibleCount >= filtered.length) return;
        setLoadingMore(true);
        setTimeout(() => {
            setVisibleCount(prev => Math.min(prev + 5, filtered.length));
            setLoadingMore(false);
        }, 300);
    };

    return (
        <SafeAreaView style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'android' ? insets.top : 0,
        }}>
            {/* 상단 타이틀 + 플러스 + 필터 버튼 */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.lg,
                paddingBottom: spacing.sm,
                backgroundColor: colors.background,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
            }}>
                <Text style={{ fontSize: font.heading+10, fontWeight: 'bold', color: colors.text }}>부서활동</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={openFilter} style={{
                        marginRight: 8,
                        backgroundColor: colors.background,
                        borderRadius: 16,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}>
                        <Ionicons name="filter" size={18} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14, marginLeft: 4 }}>필터</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/department/createDep')}
                        style={{
                        backgroundColor: colors.primary,
                        borderRadius: 18,
                        padding: 2,
                        shadowColor: '#000',
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                    }}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
            {/* 선택된 교회/부서 표시 (탭처럼) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.sm, gap: 8 }}>
                <View style={{
                    backgroundColor: (selectedCampus === '전체' && selectedDept === '전체') ? colors.primary : colors.background,
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: (selectedCampus === '전체' && selectedDept === '전체') ? colors.primary : colors.border,
                }}>
                    <Text style={{ color: (selectedCampus === '전체' && selectedDept === '전체') ? '#fff' : colors.text, fontWeight: '600', fontSize: 15 }}>
                        전체 피드
                    </Text>
                </View>
                {(selectedCampus !== '전체' || selectedDept !== '전체') && (
                    <View style={{
                        backgroundColor: colors.primary,
                        borderRadius: 16,
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: colors.primary,
                    }}>
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                            {selectedCampus}{selectedDept !== '전체' ? ' · ' + selectedDept : ''}
                        </Text>
                    </View>
                )}
            </View>
            {/* 피드 리스트 */}
            <FlatList
                data={visibleFeeds}
                ref={mainListRef}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: spacing.lg, gap: 18 }}
                renderItem={({ item }) => (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: radius.lg,
                        shadowColor: '#000',
                        shadowOpacity: 0.07,
                        shadowRadius: 10,
                        elevation: 2,
                        marginBottom: 0,
                        overflow: 'hidden',
                    }}>
                        <View style={{
                            height: 300,
                            borderTopLeftRadius: radius.lg,
                            borderTopRightRadius: radius.lg,
                            backgroundColor: item.color,
                        }} />
                        <View style={{ padding: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 16 }}>{item.dept}</Text>
                                <Text style={{ color: colors.subtext, marginLeft: 10, fontSize: 13 }}>{item.campus}</Text>
                                <Text style={{ color: colors.subtext, marginLeft: 10, fontSize: 13 }}>{item.time}</Text>
                            </View>
                            <Text numberOfLines={3} style={{ color: colors.text, fontSize: 16, marginBottom: 8, lineHeight: 22 }}>{item.content}</Text>
                            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6, opacity: 0.12 }} />
                            <Text style={{ color: colors.subtext, fontSize: 13 }}>{item.writer}</Text>
                        </View>
                    </View>
                )}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.2}
                ListFooterComponent={loadingMore ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: colors.subtext }}>불러오는 중...</Text>
                    </View>
                ) : null}
            />
            {/* 필터 모달 */}
            <Modal visible={filterModal} animationType="slide" transparent onRequestClose={() => setFilterModal(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.18)' }}>
                    <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 24, minHeight: 320 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 18, color: colors.text }}>필터</Text>
                        <Text style={{ fontWeight: 'bold', color: colors.subtext, marginBottom: 8 }}>교회</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                            {CAMPUSES.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    onPress={() => setTempCampus(c)}
                                    style={{
                                        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
                                        backgroundColor: tempCampus === c ? colors.primary : colors.background,
                                        borderWidth: 1,
                                        borderColor: tempCampus === c ? colors.primary : colors.border,
                                        marginBottom: 6,
                                    }}
                                >
                                    <Text style={{ color: tempCampus === c ? '#fff' : colors.text, fontWeight: 'bold', fontSize: 14 }}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={{ fontWeight: 'bold', color: colors.subtext, marginBottom: 8 }}>부서</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                            {DEPARTMENTS.map(d => (
                        <TouchableOpacity
                                    key={d}
                                    onPress={() => setTempDept(d)}
                                    style={{
                                        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
                                        backgroundColor: tempDept === d ? colors.primary : colors.background,
                                        borderWidth: 1,
                                        borderColor: tempDept === d ? colors.primary : colors.border,
                                        marginBottom: 6,
                                    }}
                                >
                                    <Text style={{ color: tempDept === d ? '#fff' : colors.text, fontWeight: 'bold', fontSize: 14 }}>{d}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                            <TouchableOpacity onPress={resetFilter} style={{ backgroundColor: colors.background, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1, borderColor: colors.border }}>
                                <Text style={{ color: colors.subtext, fontWeight: 'bold' }}>초기화</Text>
                    </TouchableOpacity>
                            <TouchableOpacity onPress={applyFilter} style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 32 }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>적용</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slideContainer: {
        flexDirection: 'row',
        flex: 1,
    },
    page: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 24,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    dept: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2563eb',
        marginBottom: 6,
    },
    campus: {
        fontSize: 15,
        color: '#888',
    },
    backButton: {
        marginBottom: 16,
        alignItems: 'center',
    },
});
