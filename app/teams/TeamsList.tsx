import SkeletonBox from '@/components/Skeleton';
import { useDesign } from '@/context/DesignSystem';
import { useTeams } from '@/hooks/useTeams';
import { setScrollCallback } from '@/utils/scrollRefManager';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  FlatList,
  // Image,
  Modal,
  Platform,
  RefreshControl,
  TextInput as RNTextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-root-toast';
import { EdgeInsets, useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
// const SCREEN_WIDTH = Dimensions.get('window').width;

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
  color: ${({ theme }: any) => theme.colors.text};
`;

const Actions = styled.View<{ theme: Theme }>`
  flex-direction: row;
  gap: 16px;
`;

const SearchInputContainer = styled.View<{ theme: Theme }>`
  padding-horizontal: 15px;
  margin-bottom: 10px;
`;

const FilterSortContainer = styled.View<{ theme: Theme }>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-top-width: 1px;
  border-bottom-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  margin-horizontal: ${({ theme }: any) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: any) => theme.spacing.sm}px;
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
  color: ${({ theme }: any) => theme.colors.text};
  font-size: ${({ theme }: any) => theme.font.body}px;
`;

const StyledIcon = styled(Ionicons)<{ theme: Theme }>`
  color: ${({ theme }: any) => theme.colors.text};
`;

const NoTeamsView = styled.View<{ theme: Theme }>`
  align-items: center;
  margin-top: 40px;
`;

const NoTeamsText = styled.Text<{ theme: Theme }>`
  color: ${({ theme }: any) => theme.colors.subtext};
`;

const Tab = createMaterialTopTabNavigator();

// 카테고리 문자열을 normalize (이모지, 공백, 대소문자, 특수문자 제거)
function normalizeCategory(str: string) {
  return (str || '')
    .replace(/\s/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase();
}

export default function TeamsList() {
  const [isGrid, setIsGrid] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mainListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { colors, radius, spacing, font } = useDesign();
  const frame = useSafeAreaFrame();
  const SCREEN_WIDTH = frame.width;
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('최신개설순');
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredSortOption = useDeferredValue(sortOption);
  const deferredCategory = useDeferredValue(category);
  const deferredFilter = useDeferredValue(filter);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchInputRef = useRef<RNTextInput>(null);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [currentUserUid, setCurrentUserUid] = useState('');
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'teams' | 'community'>('teams');
  // 통합 필터 상태 관리
  const [filters, setFilters] = useState({
    recruitingOnly: false,
    joinedOnly: false,
  });
  const { filter: currentFilterParam } = useLocalSearchParams(); // filter param 받아오기
  const navigation = useNavigation();

  // TanStack Query 훅 사용
  const { data: teams = [], isLoading: loading, refetch: refetchTeams } = useTeams();
  const categories = [
    '✨ 반짝소모임',
    '🏃 운동·스포츠',
    '📚 책모임',
    '🎮 게임',
    '🎭 문화생활',
    '📖 스터디',
    '🐾 동물',
    '🛠 제작',
    '🤝 봉사',
    '📢 구인',
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const raw = await AsyncStorage.getItem('currentUser');
      if (raw) {
        const user = JSON.parse(raw);
        setUserEmail(user.email);
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
    if (typeof currentFilterParam === 'string' && currentFilterParam.length > 0) {
      setFilter(currentFilterParam);
    } else {
      // 🔁 filter 없으면 전체 목록
      setFilter('');
    }
  }, [currentFilterParam]);

  useEffect(() => {
    // @ts-ignore: expo-router/native-stack tabPress 타입 오류 우회
    const unsubscribe = navigation.addListener('tabPress' as any, (e: any) => {
      mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

  // 필터링 적용 로직
  const filteredTeams = useMemo(() => {
    if (!teams.length) return [];

    let filtered = [...teams];

    // 카테고리 필터 적용 (normalize)
    if (deferredCategory) {
      filtered = filtered.filter(
        (team) => normalizeCategory(team.category) === normalizeCategory(deferredCategory)
      );
    }

    // 모집중 필터 적용
    if (filters.recruitingOnly) {
      filtered = filtered.filter((team) => {
        const members = team.membersList?.length ?? 0;
        const max = team.maxMembers ?? null;
        const isUnlimited = max === -1 || max === null || max === undefined;
        const isFull = !isUnlimited && typeof max === 'number' && members >= max;
        return !isFull && !team.isClosed;
      });
    }

    // 내가 가입된 모임만 보기
    if (filters.joinedOnly && userEmail) {
      filtered = filtered.filter(
        (team) => Array.isArray(team.membersList) && team.membersList.includes(userEmail)
      );
    }

    // 검색어 적용
    if (deferredSearchQuery) {
      const keyword = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (team) =>
          team.name?.toLowerCase().includes(keyword) || team.leader?.toLowerCase().includes(keyword)
      );
    }

    // 정렬 적용
    if (deferredSortOption === '최신개설순') {
      filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else if (deferredSortOption === '멤버수 많은 순') {
      filtered.sort((a, b) => (b.membersList?.length || 0) - (a.membersList?.length || 0));
    } else if (deferredSortOption === '멤버수 적은 순') {
      filtered.sort((a, b) => (a.membersList?.length || 0) - (b.membersList?.length || 0));
    }

    return filtered;
  }, [teams, deferredCategory, deferredSearchQuery, deferredSortOption, filters, userEmail]);

  // 팀 상세에서 돌아올 때마다 목록 최신화
  useFocusEffect(
    useCallback(() => {
      refetchTeams();
      // 화면에 포커스될 때마다 필터링 초기화
      if (!currentFilterParam || currentFilterParam === '') {
        setFilter('');
      }
    }, [currentFilterParam])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchTeams();
    } catch (e) {
      Toast.show('소모임 목록 새로고침 실패. 네트워크를 확인해주세요.', {
        position: Toast.positions.CENTER,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handlePress = (id: string) => {
    router.push(`/teams/${id}`);
  };

  const handleFilterChange = (option: string) => {
    if (option === '상세 필터') {
      setFilterModalVisible(true);
      return;
    }

    // 간소화된 필터 적용 - 상태 업데이트만 수행
    if (option === '멤버 모집중인 모임만 보기') {
      setFilters((prev) => ({ ...prev, recruitingOnly: !prev.recruitingOnly }));
    } else if (option === '내가 가입된 모임만 보기') {
      setFilters((prev) => ({ ...prev, joinedOnly: !prev.joinedOnly }));
    }
  };

  const GRID_SPACING = 12;
  const GRID_COLUMNS = 2;

  // 유동적 썸네일 크기 계산
  const thumbnailWidth = isGrid
    ? (SCREEN_WIDTH - (GRID_COLUMNS + 1) * GRID_SPACING) / GRID_COLUMNS
    : 100; // 리스트 모드 고정 높이
  const cardWidth = isGrid
    ? (SCREEN_WIDTH - 3 * 12) / 2 // 그리드 모드 카드 너비
    : SCREEN_WIDTH - 32; // 리스트 모드 카드 너비
  const thumbnailHeight = isGrid ? thumbnailWidth * 0.7 : 100; // 16:9 비율

  const renderFilterModal = () => (
    <Modal
      visible={isFilterModalVisible}
      transparent
      animationType='slide'
      onRequestClose={() => setFilterModalVisible(false)}>
      <TouchableOpacity
        activeOpacity={1}
        onPressOut={() => setFilterModalVisible(false)}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
          }}>
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
            }}>
            <Text style={{ fontSize: font.body, color: colors.text, marginRight: 10 }}>
              모집상태: 멤버 모집중인 모임만 보기
            </Text>
            <Ionicons
              name={filters.recruitingOnly ? 'checkbox' : 'square-outline'}
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
            }}>
            <Text style={{ fontSize: font.body, color: colors.text, marginRight: 10 }}>
              내 모임: 내가 가입된 모임만 보기
            </Text>
            <Ionicons
              name={filters.joinedOnly ? 'checkbox' : 'square-outline'}
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
      animationType='slide'
      onRequestClose={() => setCategoryModalVisible(false)}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        activeOpacity={1}
        onPressOut={() => setCategoryModalVisible(false)}>
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
          }}>
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
              setCategory('');
              setCategoryModalVisible(false);
            }}
            style={{
              paddingVertical: spacing.sm,
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: font.body,
                color: category === '' ? colors.primary : colors.text,
                fontWeight: category === '' ? 'bold' : 'normal',
              }}>
              전체
            </Text>
          </TouchableOpacity>

          {/* 나머지 카테고리 */}
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => {
                setCategory(category);
                setCategoryModalVisible(false);
              }}
              style={{
                paddingVertical: spacing.sm,
                alignItems: 'center',
              }}>
              <Text
                style={{
                  fontSize: font.body,
                  color: category === category ? colors.primary : colors.text,
                  fontWeight: category === category ? 'bold' : 'normal',
                }}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const handleSortChange = (option: string) => {
    // 정렬 옵션 설정만 수행 - useMemo에서 실제 정렬 로직 실행
    setSortOption(option);
    setSortModalVisible(false);
  };

  const handleCategorySelect = (category: string) => {
    // 상태 업데이트만 수행
    setCategory(category === '전체' ? '' : category);
    setCategoryModalVisible(false);
  };

  const renderSortModal = () => (
    <Modal visible={isSortModalVisible} transparent animationType='slide'>
      <TouchableOpacity
        activeOpacity={1}
        onPressOut={() => setSortModalVisible(false)}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
          }}>
          {/* 핸들바 */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc' }} />
          </View>

          {['최신개설순', '멤버수 많은 순', '멤버수 적은 순'].map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => {
                handleSortChange(option);
                setSortModalVisible(false);
              }}
              style={{
                paddingVertical: spacing.md,
                alignItems: 'center',
              }}>
              <Text
                style={{
                  color: sortOption === option ? colors.primary : colors.subtext,
                  fontSize: font.heading,
                  fontWeight: sortOption === option ? 'bold' : 'normal',
                }}>
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
          flexDirection: isGrid ? 'column' : 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          margin: 6,
          width: isGrid ? (SCREEN_WIDTH - 3 * 12) / 2 : SCREEN_WIDTH - 32, // 리스트 모드일 때 더 넓게
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
          overflow: 'hidden',
        }}
        onPress={() => handlePress(item.id)}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={{
              width: isGrid ? '100%' : 100,
              height: isGrid ? thumbnailHeight : 100,
              borderRadius: 8,
              backgroundColor: '#eee',
              marginRight: isGrid ? 0 : 12,
              marginBottom: isGrid ? 8 : 0,
            }}
            cachePolicy='disk'
            contentFit='cover'
          />
        ) : (
          <View
            style={{
              width: isGrid ? '100%' : 100,
              height: isGrid ? thumbnailHeight : 100,
              borderRadius: 8,
              backgroundColor: '#eee',
              marginRight: 12,
              marginBottom: isGrid ? 8 : 0,
            }}
          />
        )}

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}>
            <Text style={{ fontSize: isGrid ? 16 : 18, fontWeight: '600', color: colors.text }}>
              {item.name}
            </Text>

            {item.category === '✨ 반짝소모임' && (
              <Text style={{ fontSize: 12, color: colors.notification, fontWeight: 'bold' }}>
                D-{dayjs(item.expirationDate.seconds * 1000).diff(dayjs(), 'day')}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 13, color: colors.primary, marginBottom: 8 }}>
            {item.category ? `(${item.category})` : '(카테고리 없음)'}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons
              name='person-outline'
              size={14}
              color={colors.subtext}
              style={{ marginRight: 4 }}
            />
            <Text style={{ fontSize: 12, color: colors.subtext }}>모임장: {item.leader}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons
              name='people-outline'
              size={14}
              color={isFull ? colors.error : colors.subtext}
              style={{ marginRight: 4 }}
            />
            <Text
              style={{
                fontSize: 12,
                color: isFull || item.isClosed ? colors.error : colors.subtext,
              }}>
              인원: {members} / {isUnlimited ? '무제한' : max}
              {isFull || item.isClosed ? ' (모집마감)' : '(모집중)'}
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
    <Suspense fallback={<Text style={{ textAlign: 'center', marginTop: 40 }}>로딩 중...</Text>}>
      <SafeArea insets={insets}>
        <Header>
          <Title>📋 소모임 목록</Title>
          <Actions>
            <TouchableOpacity
              onPress={() => {
                setIsSearchVisible((prev) => !prev);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}>
              <StyledIcon name={isSearchVisible ? 'close' : 'search'} size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/teams/create')}>
              <StyledIcon name='add-circle-outline' size={26} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsGrid(!isGrid)}>
              <StyledIcon name={isGrid ? 'list-outline' : 'grid-outline'} size={24} />
            </TouchableOpacity>
          </Actions>
        </Header>

        {isSearchVisible && (
          <SearchInputContainer>
            <RNTextInput
              ref={searchInputRef}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                color: colors.text,
                backgroundColor: colors.surface,
              }}
              placeholder='팀 이름 또는 모임장으로 검색'
              placeholderTextColor={colors.subtext}
              value={searchQuery}
              onChangeText={(text: any) => {
                setSearchQuery(text);
                // 디바운스 효과는 useMemo에서 자동으로 처리됨
              }}
            />
          </SearchInputContainer>
        )}

        <FilterSortContainer>
          <FilterButton onPress={() => handleFilterChange('상세 필터')}>
            <StyledText>상세 필터</StyledText>
            <StyledIcon name='filter' size={18} />
          </FilterButton>

          <View style={{ height: '100%', width: 1, backgroundColor: colors.border }} />

          <CategoryButton onPress={() => setCategoryModalVisible(true)}>
            <StyledText>{category ? category : '카테고리'}</StyledText>
            <StyledIcon name='chevron-down' size={18} style={{ marginLeft: 4 }} />
          </CategoryButton>

          <View style={{ height: '100%', width: 1, backgroundColor: colors.border }} />

          <SortButton onPress={() => setSortModalVisible(true)}>
            <StyledText>{sortOption}</StyledText>
            <StyledIcon name='swap-vertical' size={18} style={{ marginRight: 20 }} />
          </SortButton>
        </FilterSortContainer>

        {renderFilterModal()}
        {renderCategoryModal()}
        {renderSortModal()}

        {loading && !refreshing ? (
          renderSkeletons()
        ) : filteredTeams.length === 0 ? (
          <NoTeamsView>
            <NoTeamsText>{loading ? '' : '등록된 소모임이 없습니다.'}</NoTeamsText>
          </NoTeamsView>
        ) : (
          <FlatList
            ref={mainListRef}
            data={filteredTeams}
            key={isGrid ? 'grid' : 'list'}
            numColumns={isGrid ? 2 : 1}
            keyExtractor={(item) => item.id?.toString?.() || String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, !isGrid && { paddingHorizontal: 10 }]}
            columnWrapperStyle={isGrid && { gap: 4 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onEndReachedThreshold={0.3}
            // onEndReached={() => fetchTeams()} // TanStack Query 무한 스크롤 필요시 별도 구현
          />
        )}
      </SafeArea>
    </Suspense>
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
  filterButton: {},
});
