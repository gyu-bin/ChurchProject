import { useDesign } from '@/app/context/DesignSystem';
import SkeletonBox from '@/components/Skeleton';
import { db } from '@/firebase/config';
import { setScrollCallback } from '@/utils/scrollRefManager';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
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
    const { colors } = useDesign();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const searchInputRef = useRef<TextInput>(null);

    useEffect(() => {
        setScrollCallback('teams', () => {
            mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
    }, []);

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
            } else {
                setTeams(prev => [...prev, ...fetched]);
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
            fetchTeams(true);
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
                        updated[index] = doc; // 업데이트
                    } else {
                        updated.unshift(doc); // 새로 추가
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

    //검색
    const filteredTeams = teams.filter((team) => {
        const keyword = searchQuery.toLowerCase();
        return (
            team.name?.toLowerCase().includes(keyword) ||
            team.leader?.toLowerCase().includes(keyword)
        );
    });

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
                        ? [styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]
                        : [styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]
                }
                onPress={() => handlePress(item.id)}
            >
                <View style={styles.textContainer}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.meta, { color: colors.subtext, fontWeight: 'bold' }]}>
                        👤 모임장: {item.leader}
                    </Text>
                    <Text
                        style={[
                            styles.meta,
                            isFull && styles.fullText,
                            {
                                color: isFull ? colors.error : colors.subtext,
                            },
                        ]}
                    >
                        👥 인원: {members} / {isUnlimited ? '∞' : max}
                        {isFull ? ' (모집마감)' : ''}
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
                            setTimeout(() => searchInputRef.current?.focus(), 100); // 딜레이 후 focus
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
});
