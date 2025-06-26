import { useDesign } from '@/context/DesignSystem';
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
    Image,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Define the theme interface
interface Theme {
    colors: {
        background: string;
        primary: string;
        surface: string;
        text: string;
        border: string;
        subtext: string;
    };
    radius: {
        lg: number;
    };
    spacing: {
        md: number;
        sm: number;
    };
    font: {
        body: number;
        heading: number;
    };
}

// Styled components
const SafeArea = styled.SafeAreaView<{ insets: EdgeInsets }>`
    flex: 1;
    background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
    padding-top: ${({ insets }: { insets: EdgeInsets }) => Platform.OS === 'android' ? insets.top + 10 : 0}px;
`;

const Header = styled.View<{ theme: Theme }>`
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-top: ${Platform.OS === 'ios' ? 15 : 10}px;
    padding-horizontal: 15px;
`;

const Title = styled.Text<{ theme: Theme }>`
    font-size: 24px;
    font-weight: bold;
    color: ${({ theme }:any) => theme.colors.text};
`;

const Actions = styled.View<{ theme: Theme }>`
    flex-direction: row;
    gap: 16px;
`;

const SearchInputContainer = styled.View<{ theme: Theme }>`
    padding-horizontal: 15px;
    margin-bottom: 10px;
`;

const SearchInput = styled.TextInput<{ theme: Theme }>`
    border-width: 1px;
    border-color: ${({ theme }:any) => theme.colors.border};
    border-radius: 8px;
    padding-horizontal: 12px;
    padding-vertical: 8px;
    color: ${({ theme }:any) => theme.colors.text};
    background-color: ${({ theme }:any) => theme.colors.surface};
`;

const FilterSortContainer = styled.View<{ theme: Theme }>`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    border-top-width: 1px;
    border-bottom-width: 1px;
    border-color: ${({ theme }:any) => theme.colors.border};
    margin-horizontal: ${({ theme }:any) => theme.spacing.md}px;
    padding-vertical: ${({ theme }:any) => theme.spacing.sm}px;
`;

const FilterButton = styled(TouchableOpacity)<{ theme: Theme }>`
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    min-width: 100px;
`;

const CategoryButton = styled(TouchableOpacity)<{ theme: Theme }>`
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    flex: 1;
    min-width: 150px;
`;

const SortButton = styled(TouchableOpacity)<{ theme: Theme }>`
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    min-width: 150px;
`;

const StyledText = styled.Text<{ theme: Theme }>`
    color: ${({ theme }:any) => theme.colors.text};
    font-size: ${({ theme }:any) => theme.font.body}px;
`;

const StyledIcon = styled(Ionicons)<{ theme: Theme }>`
    color: ${({ theme }:any) => theme.colors.text};
`;

const NoTeamsView = styled.View<{ theme: Theme }>`
    align-items: center;
    margin-top: 40px;
`;

const NoTeamsText = styled.Text<{ theme: Theme }>`
    color: ${({ theme }:any) => theme.colors.subtext};
`;

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
        if (typeof filter === 'string' && filter.length > 0) {
            setCategoryOption(filter);
            setFilterOption('');
            setTeams(allTeams.filter(team => team.category === filter));
        } else {
            // 🔁 filter 없으면 전체 목록
            setCategoryOption('');
            setFilterOption('');
            setTeams(allTeams); // 또는 초기값
        }
    }, [filter, allTeams]);

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
            if (!filter || filter === '') {
                setCategoryOption('');
                setFilterOption('전체');
                fetchTeams(true);
            }
        }, [filter])
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
                Array.isArray(team.membersList) && team.membersList.includes(userEmail)
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
                style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 8, // 🔽 패딩 줄임
                    margin: 6,
                    width: (SCREEN_WIDTH - 3 * 12) / 2, // 🔽 좌우 margin 고려한 2열 정렬
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                }}
                onPress={() => handlePress(item.id)}
            >
                {item.thumbnail? (
                    <Image
                        source={{ uri: item.thumbnail}}
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            backgroundColor: '#eee',
                            marginRight: 12,
                        }}
                    />
                ) : (
                    <View
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            backgroundColor: '#eee',
                            marginRight: 12,
                        }}
                    />
                )}

                <View style={{ flex: 1 }}>
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
                        <Ionicons
                            name="people-outline"
                            size={14}
                            color={isFull ? colors.error : colors.subtext}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={{ fontSize: 12, color: (isFull || item.isClosed) ? colors.error : colors.subtext }}>
                            인원: {members} / {isUnlimited ? '무제한' : max}
                            {(isFull || item.isClosed) ?' (모집마감)' : '(모집중)'}
                        </Text>
                    </View>
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
        <SafeArea insets={insets}>
            <Header>
                <Title>📋 소모임 목록</Title>
                <Actions>
                    <TouchableOpacity
                        onPress={() => {
                            setIsSearchVisible(prev => !prev);
                            setTimeout(() => searchInputRef.current?.focus(), 100);
                        }}
                    >
                        <StyledIcon name={isSearchVisible ? 'close' : 'search'} size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/teams/create')}>
                        <StyledIcon name="add-circle-outline" size={26} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsGrid(!isGrid)}>
                        <StyledIcon name={isGrid ? 'list-outline' : 'grid-outline'} size={24} />
                    </TouchableOpacity>
                </Actions>
            </Header>

            {isSearchVisible && (
                <SearchInputContainer>
                    <SearchInput
                        ref={searchInputRef}
                        placeholder="팀 이름 또는 모임장으로 검색"
                        placeholderTextColor={colors.subtext}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </SearchInputContainer>
            )}

            <FilterSortContainer>
                <FilterButton onPress={() => handleFilterChange('상세 필터')}>
                    <StyledText>상세 필터</StyledText>
                    <StyledIcon name="filter" size={18} />
                </FilterButton>

                <View style={{ height: '100%', width: 1, backgroundColor: colors.border }} />

                <CategoryButton onPress={() => setCategoryModalVisible(true)}>
                    <StyledText>{categoryOption && categoryOption !== '전체' ? categoryOption : '카테고리'}</StyledText>
                    <StyledIcon name="chevron-down" size={18} style={{ marginLeft: 4 }} />
                </CategoryButton>

                <View style={{ height: '100%', width: 1, backgroundColor: colors.border }} />

                <SortButton onPress={() => setSortModalVisible(true)}>
                    <StyledText>{sortOption}</StyledText>
                    <StyledIcon name="swap-vertical" size={18} />
                </SortButton>
            </FilterSortContainer>

            {renderFilterModal()}
            {renderCategoryModal()}
            {renderSortModal()}

            {loading && !refreshing ? (
                renderSkeletons()
            ) : teams.length === 0 ? (
                <NoTeamsView>
                    <NoTeamsText>등록된 소모임이 없습니다.</NoTeamsText>
                </NoTeamsView>
            ) : (
                <FlatList
                    ref={mainListRef}
                    data={filteredTeams}
                    key={isGrid ? 'grid' : 'list'}
                    numColumns={isGrid ? 2 : 1}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={isGrid && { gap: 4 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    onEndReachedThreshold={0.3}
                    onEndReached={() => fetchTeams()}
                />
            )}
        </SafeArea>
    );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
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
