import { useDesign } from '@/app/context/DesignSystem';
import SkeletonBox from '@/components/Skeleton';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { setScrollCallback } from '@/utils/scrollRefManager';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export default function TeamsScreen() {
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGrid, setIsGrid] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const mainListRef = useRef<FlatList>(null);
    const router = useRouter();
    const { colors, radius, spacing, font } = useDesign();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const searchInputRef = useRef<TextInput>(null);
    const [filterOption, setFilterOption] = useState('모집중,가입된 모임만 보기');
    const [sortOption, setSortOption] = useState('최신개설순');
    const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
    const [isSortModalVisible, setSortModalVisible] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [filterOptions, setFilterOptions] = useState<string[]>([]);
    const [currentUserUid, setCurrentUserUid] = useState('');
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [categoryOption, setCategoryOption] = useState(''); // '✨ 반짝소모임' 등
    const { filter } = useLocalSearchParams(); // filter param 받아오기
    const [firstLoad, setFirstLoad] = useState(true);
    const categories = [
        '✨ 반짝소모임',
        '🏃 운동/스포츠',
        '📚 책모임',
        '🎮 게임',
        '🎭 문화생활',
        '🤝 봉사',
        '📖 스터디',
        '🐾 동물',
        '🍳 요리/제조'
    ];

    useEffect(() => {
        const fetchUser = async () => {
            const user = await getCurrentUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
            if (user?.uid) {
                setCurrentUserUid(user.uid);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        setScrollCallback('teams', () => {
            mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
    }, []);

    useEffect(() => {
        if (firstLoad && filter && typeof filter === 'string') {
          setCategoryOption(filter);
          setFilterOption('');
          setTeams(allTeams.filter(team => team.category === filter));
          setFirstLoad(false); // ✅ 최초 진입 이후엔 필터 적용 안 함
        }
      }, [filter, allTeams, firstLoad]);

    const fetchTeams = useCallback(async (isInitial = false) => {
        if (!hasMore && !isInitial) return;

        try {
            if (isInitial) {
                setLoading(true);
                setLastDoc(null);
                setHasMore(true);
            }

            const baseQuery = query(
                collection(db, 'teams'),
                where('approved', '==', true),
                orderBy('createdAt', 'desc'),
                ...(isInitial || !lastDoc ? [] : [startAfter(lastDoc)]),
                limit(10)
            );

            const snap = await getDocs(baseQuery);
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (isInitial) {
                setTeams(fetched);
                setAllTeams(fetched);
            } else {
                setTeams(prev => [...prev, ...fetched]);
                setAllTeams(prev => [...prev, ...fetched]);
            }

            setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
            setHasMore(snap.size === 10);
        } catch (e) {
            console.error('🔥 fetchTeams error:', e);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [lastDoc, hasMore]);

    useEffect(() => {
        fetchTeams(true);
    }, []);

useFocusEffect(
    useCallback(() => {
        return () => {
            setCategoryOption('');           // ✅ 카테고리 초기화
            setFilterOption('전체');         // ✅ 기본 필터로 변경
            fetchTeams(true);               // ✅ 전체 팀 다시 불러오기
        };
    }, [])
);

    useEffect(() => {
        const q = query(
            collection(db, 'teams'),
            where('approved', '==', true),
            orderBy('createdAt', 'desc'),
            limit(2)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setTeams(prev => {
                const updated = [...prev];
                const ids = new Set(prev.map(item => item.id));

                newDocs.forEach(doc => {
                    const index = updated.findIndex(item => item.id === doc.id);
                    if (index >= 0) {
                        updated[index] = doc;
                    } else {
                        updated.unshift(doc);
                    }
                });

                return updated;
            });
        });

        return () => unsubscribe();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchTeams(true);
        setRefreshing(false);
    };

    const handlePress = (id: string) => {
        router.push(`/teams/${id}`);
    };

    const filteredTeams = teams.filter((team) => {
        const keyword = searchQuery.toLowerCase();
        return (
            team.name?.toLowerCase().includes(keyword) ||
            team.leader?.toLowerCase().includes(keyword)
        );
    });

    const handleFilterChange = (option: string) => {
        if (option === '상세 필터') {
            setFilterModalVisible(true); // ✅ 올바른 모달 오픈
            return;
        }

        let updatedOptions = [...filterOptions];
        if (updatedOptions.includes(option)) {
            updatedOptions = updatedOptions.filter(opt => opt !== option);
        } else {
            updatedOptions.push(option);
        }
        setFilterOptions(updatedOptions);

        let filtered = allTeams;

        if (updatedOptions.includes('멤버 모집중인 모임만 보기')) {
            filtered = filtered.filter(team => {
                const members = team.membersList?.length ?? 0;
                const max = team.maxMembers ?? null;
                const isUnlimited = max === -1 || max === null || max === undefined;
                const isFull = !isUnlimited && typeof max === 'number' && members >= max;
                return !isFull;
            });
        }

        if (updatedOptions.includes('내가 가입된 모임만 보기')) {
            filtered = filtered.filter(team =>
                team.leaderEmail === userEmail
            );
        }

        setTeams(filtered);
    };

    const renderFilterModal = () => (
        <Modal visible={isFilterModalVisible} transparent animationType="slide"
               onRequestClose={() => setFilterModalVisible(false)}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPressOut={() => setFilterModalVisible(false)}
                style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        backgroundColor: colors.background,
                        paddingHorizontal: spacing.md,
                        paddingTop: 16,
                        paddingBottom: (insets.bottom || 20) + 30,
                    }}
                >
                    {/* 핸들 */}
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc' }} />
                    </View>

                    {/* 필터 항목 */}
                    <TouchableOpacity
                        onPress={() => handleFilterChange('멤버 모집중인 모임만 보기')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: spacing.md,
                        }}
                    >
                        <Text style={{ fontSize: font.body, color: colors.text, marginRight: 10 }}>
                            모집상태:멤버 모집중인 모임만 보기
                        </Text>
                        <Ionicons
                            name={filterOptions.includes('멤버 모집중인 모임만 보기') ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={colors.primary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleFilterChange('내가 가입된 모임만 보기')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: spacing.md,
                        }}
                    >
                        <Text style={{ fontSize: font.body, color: colors.text, marginRight: 10 }}>
                            내 모임: 내가 가입된 모임만 보기
                        </Text>
                        <Ionicons
                            name={filterOptions.includes('내가 가입된 모임만 보기') ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={colors.primary}
                        />
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );

    const renderCategoryModal = () => (
        <Modal
            visible={isCategoryModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setCategoryModalVisible(false)}
        >
            <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                activeOpacity={1}
                onPressOut={() => setCategoryModalVisible(false)}
            >
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        backgroundColor: colors.background,
                        paddingTop: 16,
                        paddingBottom: insets.bottom + 20,
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                    }}
                >
                    {/* 핸들 */}
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <View
                            style={{
                                width: 40,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: '#ccc',
                            }}
                        />
                    </View>

                    {/* 전체 카테고리 */}
                    <TouchableOpacity
                        onPress={() => {
                            handleCategorySelect('전체');
                            setCategoryModalVisible(false);
                        }}
                        style={{
                            paddingVertical: spacing.sm,
                            alignItems: 'center',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: font.body,
                                color: filterOption === '전체' ? colors.primary : colors.text,
                                fontWeight: filterOption === '전체' ? 'bold' : 'normal',
                            }}
                        >
                            전체
                        </Text>
                    </TouchableOpacity>

                    {/* 나머지 카테고리 */}
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category}
                            onPress={() => {
                                handleCategorySelect(category);
                                setCategoryModalVisible(false);
                            }}
                            style={{
                                paddingVertical: spacing.sm,
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: font.body,
                                    color: filterOption === category ? colors.primary : colors.text,
                                    fontWeight: filterOption === category ? 'bold' : 'normal',
                                }}
                            >
                                {category}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const handleSortChange = (option: string) => {
        setSortOption(option);
        const sorted = [...teams];
        if (option === '최신개설 모임 순') {
            sorted.sort((a, b) => b.createdAt - a.createdAt);
        } else if (option === '멤버수 많은 순') {
            sorted.sort((a, b) => (b.membersList?.length || 0) - (a.membersList?.length || 0));
        } else if (option === '멤버수 적은 순') {
            sorted.sort((a, b) => (a.membersList?.length || 0) - (b.membersList?.length || 0));
        }
        setTeams(sorted);
    };

    const handleCategorySelect = (category: string) => {
        setCategoryOption(category);
        setCategoryModalVisible(false);
      
        if (category === '전체') {
          setTeams(allTeams);
        } else {
          const filtered = allTeams.filter(team => team.category === category);
          setTeams(filtered);
        }
      };

    const renderSortModal = () => (
        <Modal visible={isSortModalVisible} transparent animationType="slide">
            <TouchableOpacity
                activeOpacity={1}
                onPressOut={() => setSortModalVisible(false)}
                style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        backgroundColor: colors.background,
                        paddingHorizontal: spacing.md,
                        paddingTop: 16,
                        paddingBottom: insets.bottom + 30,
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                    }}
                >
                    {/* 핸들바 */}
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc' }} />
                    </View>

                    {['최신개설순', '멤버수 많은 순', '멤버수 적은 순'].map(option => (
                        <TouchableOpacity
                            key={option}
                            onPress={() => {
                                handleSortChange(option);
                                setSortModalVisible(false);
                            }}
                            style={{
                                paddingVertical: spacing.md,
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    color: sortOption === option ? colors.primary : colors.subtext,
                                    fontSize: font.heading,
                                    fontWeight: sortOption === option ? 'bold' : 'normal',
                                }}
                            >
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );

    const renderItem = ({ item }: { item: any }) => {
        const members = item.membersList?.length ?? 0;
        const max = item.maxMembers ?? null;
        const isUnlimited = max === -1 || max === null || max === undefined;
        const isFull = !isUnlimited && typeof max === 'number' && members >= max;

        return (
            <TouchableOpacity
                key={item.id}
                style={
                    isGrid
  ? [
      styles.gridItem,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
    ]
  : [
      styles.listItem,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        shadowColor:  '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
    ]
                }
                onPress={() => handlePress(item.id)}
            >
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
    {item.name}
  </Text>

  <Text style={{ fontSize: 13, color: colors.primary, marginBottom: 8 }}>
    {item.category ? `(${item.category})` : '(카테고리 없음)'}
  </Text>

  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
    <Ionicons name="person-outline" size={14} color={colors.subtext} style={{ marginRight: 4 }} />
    <Text style={{ fontSize: 12, color: colors.subtext }}>모임장: {item.leader}</Text>
  </View>

  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Ionicons name="people-outline" size={14} color={isFull ? colors.error : colors.subtext} style={{ marginRight: 4 }} />
    <Text style={{ fontSize: 12, color: isFull ? colors.error : colors.subtext }}>
      인원: {members} / {isUnlimited ? '무제한' : max}
      {isFull && ' (모집마감)'}
    </Text>
  </View>
            </TouchableOpacity>
        );
    };

    const renderSkeletons = () => (
        <View style={{ flexDirection: isGrid ? 'row' : 'column', flexWrap: 'wrap', gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={isGrid ? styles.gridItem : styles.listItem}>
                    <SkeletonBox width={180} height={18} />
                    <SkeletonBox width={120} height={16} />
                    <SkeletonBox width={100} height={16} />
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background,paddingTop: Platform.OS === 'android' ? insets.top+10 : 0 }}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>📋 소모임 목록</Text>
                <View style={styles.actions}>
                    <TouchableOpacity
                        onPress={() => {
                            setIsSearchVisible(prev => !prev);
                            setTimeout(() => searchInputRef.current?.focus(), 100);
                        }}
                    >
                        <Ionicons name={isSearchVisible ? 'close' : 'search'} size={24} color={colors.subtext} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/teams/create')}>
                        <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsGrid(!isGrid)}>
                        <Ionicons name={isGrid ? 'list-outline' : 'grid-outline'} size={24} color={colors.subtext} />
                    </TouchableOpacity>
                </View>
            </View>

            {isSearchVisible && (
                <View style={{ paddingHorizontal: 15, marginBottom: 10 }}>
                    <TextInput
                        ref={searchInputRef}
                        placeholder="팀 이름 또는 모임장으로 검색"
                        placeholderTextColor={colors.subtext}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            color: colors.text,
                            backgroundColor: colors.surface,
                        }}
                    />
                </View>
            )}

            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                    marginHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                }}
            >
                <TouchableOpacity
                    onPress={() => handleFilterChange('상세 필터')}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minWidth: 120,
                    }}
                >
                    <Text style={{ color: colors.text, fontSize: font.body }}>상세 필터</Text>
                    <Ionicons name="filter" size={18} color={colors.text} />
                </TouchableOpacity>

                <View style={{ height: '60%', width: 1, backgroundColor: colors.border }} />

                {/* 가운데: 카테고리 필터 */}
                <TouchableOpacity
  onPress={() => setCategoryModalVisible(true)}
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  }}
>
  <Text style={{ color: colors.text, fontSize: font.body }}>
    {categoryOption && categoryOption !== '전체' ? categoryOption : '카테고리'}
  </Text>
  <Ionicons name="chevron-down" size={18} color={colors.text} style={{ marginLeft: 4 }} />
</TouchableOpacity>

                {/* 중간 구분선 */}
                <View style={{ height: '60%', width: 1, backgroundColor: colors.border }} />

                <TouchableOpacity
                    onPress={() => setSortModalVisible(true)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minWidth: 150,
                    }}
                >
                    <Text style={{ color: colors.text, fontSize: font.body }}>{sortOption}</Text>
                    <Ionicons name="swap-vertical" size={18} color={colors.text} />
                </TouchableOpacity>
            </View>

            {renderFilterModal()}
            {renderCategoryModal()}
            {renderSortModal()}

            {loading && !refreshing ? (
                renderSkeletons()
            ) : teams.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={{ color: colors.subtext }}>등록된 소모임이 없습니다.</Text>
                </View>
            ) : (
                <>
                    <FlatList
                    ref={mainListRef}
                    data={filteredTeams}
                    key={isGrid ? 'grid' : 'list'}
                    numColumns={isGrid ? 2 : 1}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={isGrid && {gap: 16}}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
                    onEndReachedThreshold={0.3}
                    onEndReached={() => fetchTeams()}/></>
            )}
        </SafeAreaView>
    );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: Platform.OS === 'ios' ? 15 : 10,
        paddingHorizontal: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
    },
    listContent: {
        alignItems: 'center',
        paddingBottom: 60,
        width: '100%',
    },
    gridItem: {
        width: (screenWidth - 60) / 2,
        borderRadius: 16,
        padding: 16,
        margin: 8,
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
    },
    listItem: {
        width: screenWidth - 40,
        flexDirection: 'row',
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
    },
    textContainer: {
        flexShrink: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    meta: {
        fontSize: 14,
    },
    fullText: {
        fontWeight: 'bold',
    },
    filterSortContainer: {
        flexDirection: 'row',
        gap: 1,
        padding: 10,
    },
    filterButton: {
    },
});
