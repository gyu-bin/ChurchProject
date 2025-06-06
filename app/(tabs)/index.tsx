import PrayerListModal from '@/app/prayerPage/allPrayer';
import HomeNotices from "@/app/prayerPage/noticePage";
import PrayerModal from '@/app/prayerPage/prayerModal';
import { verses } from '@/assets/verses';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { useAppDispatch } from '@/hooks/useRedux';
import { setScrollCallback } from '@/utils/scrollRefManager';
import { showToast } from "@/utils/toast";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    addDoc,
    collection,
    deleteDoc, doc,
    getDocs,
    onSnapshot,
    query, where
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Linking,
    Platform,
    RefreshControl,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE_MARGIN = 16;
const ITEM_WIDTH = SCREEN_WIDTH - SIDE_MARGIN * 2;
const SIDE_SPACING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

type Prayer = {
    id: string;
    title: string;
    content: string;
    name: string;
    visibility: 'all' | 'pastor';
    createdAt?: {
        toDate: () => Date;
    };
};

export default function HomeScreen() {
    const router = useRouter();
    const { mode } = useAppTheme();
    const theme = useDesign();
    const insets = useSafeAreaInsets();
    const [verse, setVerse] = useState(verses[0]);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState<'all' | 'pastor'>('all');
    const [prayers, setPrayers] = useState<any[]>([]);
    const [publicPrayers, setPublicPrayers] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(1); // 첫 번째 실 데이터 인덱스
    const [initialIndex, setInitialIndex] = useState<number | null>(null);
    const [listKey, setListKey] = useState(Date.now());
    const dispatch = useAppDispatch();

    const [videoData, setVideoData] = useState<any[]>([]);

    const mainListRef = useRef<FlatList>(null);
    useEffect(() => {
        setScrollCallback('index', () => {
            mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
    }, []);


    useEffect(() => {
        const fetchVideos = async () => {
            const snapshot = await getDocs(collection(db, 'videos'));
            const data = snapshot.docs.map((doc) => {
                const raw = doc.data();
                const url = raw.url;
                const match = url.match(/v=([^&]+)/);
                const id = match ? match[1] : '';

                return {
                    id: doc.id,
                    videoId: id,
                    thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
                    url,
                    order: raw.order ?? 0,
                };
            });

            const sorted = data.sort((a, b) => a.order - b.order);

            const withDummy = sorted.length >= 2
                ? [
                    { ...sorted[sorted.length - 1], id: `left-${sorted[sorted.length - 1].id}` },
                    ...sorted,
                    { ...sorted[0], id: `right-${sorted[0].id}` },
                ]
                : [...sorted];

            setVideoData(withDummy);
        };

        fetchVideos(); // ✅ 함수 호출 필요
    }, []);

    useEffect(() => {
        if (videoData.length > 2) {
            const random = Math.floor(Math.random() * (videoData.length - 2));
            setInitialIndex(random + 1); // 앞 dummy 때문에 +1
            setCurrentIndex(random + 1);
        }

        setVerse(verses[Math.floor(Math.random() * verses.length)]);
        fetchPrayers();
    }, [videoData]); // ✅ videoData가 로딩된 후 실행되도록 의존성 추가

    const scrollToIndex = (index: number, animated = true) => {
        flatListRef.current?.scrollToIndex({ index, animated });
    };

    const handleScrollEnd = (e: any) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / ITEM_WIDTH);
        if (index === 0) {
            scrollToIndex(videoData.length - 2, false);
            setCurrentIndex(videoData.length - 2);
        } else if (index === videoData.length - 1) {
            scrollToIndex(1, false);
            setCurrentIndex(1);
        } else {
            setCurrentIndex(index);
        }
    };

    const goToNext = () => scrollToIndex(currentIndex + 1);
    const goToPrev = () => scrollToIndex(currentIndex - 1);

    useEffect(() => {
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) {
                const userData = JSON.parse(raw);
                setCurrentUser(userData);
                setUser(userData);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        const subscribe = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (!raw) return;
            const currentUser = JSON.parse(raw);
            setUser(currentUser);
            const q = query(collection(db, 'notifications'), where('to', '==', currentUser.email));
            return onSnapshot(q, snapshot => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setNotifications(list);
            });
        };

        let unsubscribe: (() => void) | undefined;

        subscribe().then((unsub) => {
            unsubscribe = unsub;
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    useEffect(() => {
        setVerse(verses[Math.floor(Math.random() * verses.length)]);
        fetchPrayers();
    }, []);

    const fetchPrayers = async () => {
        const q = query(collection(db, 'prayer_requests'), where('visibility', '==', 'all'));
        const snapshot = await getDocs(q);
        const list: Prayer[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Prayer, 'id'>),
        }));

        list.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() ?? new Date(0);
            const bDate = b.createdAt?.toDate?.() ?? new Date(0);
            return bDate.getTime() - aDate.getTime();
        });

        setPrayers(list);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setVerse(verses[Math.floor(Math.random() * verses.length)]);

        if (videoData.length > 2) {
            const random = Math.floor(Math.random() * (videoData.length - 2));
            setInitialIndex(random + 1);
            setCurrentIndex(random + 1);
            setListKey(Date.now()); // 🔁 FlatList 재생성
        }

        await fetchPrayers();
        setRefreshing(false);
    }, [videoData]); // ✅ 의존성 추가

    const fetchPublicPrayers = async () => {
        const q = query(collection(db, 'prayer_requests'), where('visibility', '==', 'all'));
        const snapshot = await getDocs(q);
        setPublicPrayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setViewModalVisible(true);
    };

    const submitPrayer = async () => {
        if (!title || !content) {
            Alert.alert('모든 항목을 작성해주세요');
            return;
        }
        try {
            await addDoc(collection(db, 'prayer_requests'), {
                name: user?.name || '익명',
                title,
                content,
                email: currentUser?.email,
                visibility,
                createdAt: new Date(),
            });
            showToast('🙏 기도제목이 제출되었습니다.');
            setModalVisible(false);
            setTitle('');
            setContent('');
            setVisibility('all');
            fetchPrayers();
            router.replace('/');
        } catch (err: any) {
            Alert.alert('제출 실패', err.message);
        }
    };

    const deletePrayer = async (id: string) => {
        Alert.alert('삭제 확인', '정말 이 기도제목을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제', style: 'destructive', onPress: async () => {
                    await deleteDoc(doc(db, 'prayer_requests', id));
                    setPrayers(prev => prev.filter(p => p.id !== id));
                }
            }
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'android' ? insets.top+10 : 0 }}>
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
            <FlatList
                ref={mainListRef}
                ListHeaderComponent={(<View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.primary }}>
                            🙏 안녕하세요{user?.name ? ` ${user.name}님!` : '!'}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/notifications')} style={{ position: 'relative' }}>
                            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
                            {notifications.length > 0 && (
                                <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: theme.colors.primary, borderRadius: 12, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{notifications.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* 말씀 및 캐러셀 */}
                    <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, maxHeight: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>📖 오늘의 말씀</Text>
                        <Text style={{ fontSize: 17, fontStyle: 'italic', color: theme.colors.subtext }}>{verse.verse}</Text>
                        <Text style={{ fontSize: 14, color: theme.colors.subtext }}>({verse.reference})</Text>
                    </View>



                    {/*  알림 페이지*/}
                        <View style={{ backgroundColor: theme.colors.surface,borderRadius: theme.radius.lg, padding: theme.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 }}>
                            <HomeNotices />
                        </View>

                        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text, paddingLeft: '3%', paddingTop: '3%' }}>📺 추천 설교</Text>

                            <View style={{ position: 'relative', paddingTop: '3%', paddingBottom: '2%' }}>
                                {initialIndex !== null && (
                                    <FlatList
                                        key={listKey}
                                        ref={flatListRef}
                                        data={videoData}
                                        horizontal
                                        pagingEnabled
                                        initialScrollIndex={initialIndex}
                                        decelerationRate="fast"
                                        snapToInterval={ITEM_WIDTH}
                                        getItemLayout={(data, index) => ({
                                            length: ITEM_WIDTH,
                                            offset: ITEM_WIDTH * index,
                                            index,
                                        })}
                                        contentContainerStyle={{ paddingHorizontal: SIDE_SPACING }}
                                        showsHorizontalScrollIndicator={false}
                                        onMomentumScrollEnd={handleScrollEnd}
                                        renderItem={({ item }) => (
                                            <View style={{ width: ITEM_WIDTH }}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Alert.alert(
                                                            '🎥 유튜브로 이동',
                                                            '해당 영상을 유튜브에서 시청하시겠습니까?',
                                                            [
                                                                { text: '❌ 취소', style: 'cancel' },
                                                                {
                                                                    text: '✅ 확인',
                                                                    onPress: () => Linking.openURL(item.url),
                                                                    style: 'default',
                                                                },
                                                            ],
                                                            { cancelable: true }
                                                        );
                                                    }}
                                                >
                                                    <Image
                                                        source={{ uri: item.thumbnail }}
                                                        style={{
                                                            width: '92%',
                                                            aspectRatio: 16 / 9,
                                                            borderRadius: 14,
                                                            backgroundColor: '#ccc',
                                                        }}
                                                        resizeMode="cover"
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    />
                                )}

                                {/* 좌우 버튼 */}
                                <TouchableOpacity onPress={goToPrev} style={{ position: 'absolute', top: '40%', left: 4, zIndex: 10, backgroundColor: '#00000055', padding: 8, borderRadius: 20 }}>
                                    <Ionicons name="chevron-back" size={20} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={goToNext} style={{ position: 'absolute', top: '40%', right: 4, zIndex: 10, backgroundColor: '#00000055', padding: 8, borderRadius: 20 }}>
                                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* 🔘 인디케이터 추가 위치 */}
                            {videoData.length > 2 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 6, marginBottom: 8 }}>
                                    {videoData.slice(1, videoData.length - 1).map((_, i) => {
                                        const isActive = i + 1 === currentIndex;
                                        return (
                                            <View
                                                key={i}
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 4,
                                                    marginHorizontal: 4,
                                                    backgroundColor: isActive ? theme.colors.primary : theme.colors.border,
                                                }}
                                            />
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>💬 AI에게 신앙 질문하기</Text>
                            <TouchableOpacity onPress={() => router.push('/AiChatPage')} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>🤖 질문하러 가기</Text>
                            </TouchableOpacity>
                        </View>

                    <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>📝 기도제목</Text>
                        <TouchableOpacity onPress={() => setModalVisible(true)} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>🙏 기도제목 나누기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={fetchPublicPrayers} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>📃 기도제목 보기</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>📝 매일묵상</Text>
                        <TouchableOpacity onPress={()=>router.push('/prayerPage/DailyBible')} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>🤝 매일묵상 나누기</Text>
                        </TouchableOpacity>
                    </View>



                </View>
                )}
                data={prayers}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={() => <View />}
            />

            <PrayerModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSubmit={submitPrayer}
                name={user?.name ?? '익명'}
                email={user?.email ?? ''}
                title={title}
                content={content}
                visibility={visibility}
                setTitle={setTitle}
                setContent={setContent}
                setVisibility={setVisibility}
            />

            <PrayerListModal
                visible={viewModalVisible}
                prayers={publicPrayers}
                currentUser={currentUser}
                onClose={() => setViewModalVisible(false)}
                onDelete={deletePrayer}
            />


        </SafeAreaView>
    );
}
