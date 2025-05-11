// ✅ 완전체: 요청사항 반영된 HomeScreen 전체 코드
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, SafeAreaView, FlatList, RefreshControl,
    TouchableOpacity, Image, Alert, Linking,
    Dimensions, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { verses } from '@/assets/verses';
import {
    collection, addDoc, getDocs, query, where, onSnapshot, orderBy, deleteDoc, doc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPushNotification, sendNotification } from '@/services/notificationService';
import PrayerModal from '../prayerPage/prayerModal';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrayerListModal from '@/app/prayerPage/allPrayer';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE_MARGIN = 16;
const ITEM_WIDTH = SCREEN_WIDTH - SIDE_MARGIN * 2;
const THUMBNAIL_WIDTH = SCREEN_WIDTH - 32;

const youtubeIds = ["hWvJdJ3Da6o", "GT5qxS6ozWU", "E3jJ02NDYCY"];
const videoData = youtubeIds.map(id => ({
    id,
    thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${id}`,
}));

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
    const [prayers, setPrayers] = useState<Prayer[]>([]);
    const [publicPrayers, setPublicPrayers] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    //영역 그림자 효과
    const cardShadowStyle = {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    };

    const goToPrev = () => {
        const newIndex = Math.max(currentIndex - 1, 0);
        flatListRef.current?.scrollToIndex({
            index: newIndex,
            animated: true,
        });
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const newIndex = Math.min(currentIndex + 1, videoData.length - 1);
        flatListRef.current?.scrollToIndex({
            index: newIndex,
            animated: true,
        });
        setCurrentIndex(newIndex);
    };

    useEffect(() => {
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) {
                setCurrentUser(JSON.parse(raw));
                setUser(JSON.parse(raw));
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        let unsubscribe: () => void;
        const subscribe = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (!raw) return;
            const currentUser = JSON.parse(raw);
            setUser(currentUser);
            const q = query(collection(db, 'notifications'), where('to', '==', currentUser.email));
            unsubscribe = onSnapshot(q, snapshot => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setNotifications(list);
            });
        };
        subscribe();
        return () => { if (unsubscribe) unsubscribe(); };
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
        await fetchPrayers();
        setRefreshing(false);
    }, []);

    const fetchPublicPrayers = async () => {
        const q = query(collection(db, 'prayer_requests'), where('visibility', '==', 'all'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPublicPrayers(list);
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

            if (visibility === 'pastor') {
                const q = query(collection(db, 'users'), where('role', '==', '교역자'));
                const snap = await getDocs(q);
                const notifiedEmails = new Set<string>();
                const pushTokens = new Set<string>();
                const notificationPromises: Promise<void>[] = [];
                for (const docSnap of snap.docs) {
                    const pastor = docSnap.data();
                    if (pastor?.email && !notifiedEmails.has(pastor.email)) {
                        notifiedEmails.add(pastor.email);
                        notificationPromises.push(
                            sendNotification({
                                to: pastor.email,
                                message: `${user?.name ?? '익명'}님의 기도제목이 등록되었습니다.`,
                                type: 'prayer_private',
                                link: '/pastor/pastor',
                                tab: 'prayers',
                            })
                        );
                    }
                    if (
                        pastor?.expoPushToken &&
                        typeof pastor.expoPushToken === 'string' &&
                        pastor.expoPushToken.startsWith('ExponentPushToken')
                    ) {
                        pushTokens.add(pastor.expoPushToken);
                    }
                }
                await Promise.all(notificationPromises);
                const uniqueTokens = Array.from(pushTokens);
                if (uniqueTokens.length > 0) {
                    await sendPushNotification({
                        to: uniqueTokens,
                        title: '🙏 새로운 기도제목',
                        body: `${user?.name ?? '익명'}님의 기도제목`,
                    });
                }
            }

            Alert.alert('제출 완료', '기도제목이 제출되었습니다.');
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
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
            <FlatList
                ListHeaderComponent={(
                    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.primary }}>🙏 안녕하세요{user?.name ? ` ${user.name}님!` : '!'}</Text>
                            <TouchableOpacity onPress={() => router.push('/notifications')} style={{ position: 'relative' }}>
                                <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
                                {notifications.length > 0 && (
                                    <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: theme.colors.primary, borderRadius: 12, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{notifications.length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View
                            style={{
                                backgroundColor: theme.colors.surface,
                                borderRadius: theme.radius.lg,
                                padding: theme.spacing.md,
                                minHeight: 120, // ✅ 말씀 최대길이 기준 OK
                                shadowColor: '#000',            // ✅ iOS 그림자
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.08,
                                shadowRadius: 6,
                                elevation: 3,                   // ✅ Android 그림자
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>📖 오늘의 말씀</Text>
                            <Text style={{ fontSize: 17, fontStyle: 'italic', color: theme.colors.subtext }}>{verse.verse}</Text>
                            <Text style={{ fontSize: 14, color: theme.colors.subtext }}>({verse.reference})</Text>
                        </View>

                        <View
                            style={{
                                backgroundColor: theme.colors.surface,
                                borderRadius: theme.radius.lg,

                                // ✅ 그림자 효과 (iOS + Android)
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.08,
                                shadowRadius: 6,
                                elevation: 3,
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text,paddingLeft: '2%'}}>📺 추천 설교</Text>
                            <View style={{ position: 'relative', paddingTop: '3%', paddingLeft: '2%', paddingRight: '2%', paddingBottom: '2%'}}>
                                <FlatList
                                    ref={flatListRef}
                                    data={videoData}
                                    horizontal
                                    pagingEnabled
                                    decelerationRate="fast"
                                    showsHorizontalScrollIndicator={false}
                                    onMomentumScrollEnd={(e) => {
                                        const offsetX = e.nativeEvent.contentOffset.x;
                                        const index = Math.round(offsetX / ITEM_WIDTH);
                                        setCurrentIndex(index);
                                    }}
                                    renderItem={({ item }) => (
                                        <View style={{ width: ITEM_WIDTH }}>
                                            <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
                                                <Image
                                                    source={{ uri: item.thumbnail }}
                                                    style={{
                                                        width: '96%',
                                                        aspectRatio: 16 / 9,
                                                        borderRadius: 12,
                                                        backgroundColor: '#ccc',
                                                        overflow: 'hidden', // ✅ 혹시 모를 잔여 제거
                                                    }}
                                                    resizeMode="cover"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                />
                                <TouchableOpacity
                                    onPress={goToPrev}
                                    style={{ position: 'absolute', top: '40%', left: 4, zIndex: 10, backgroundColor: '#00000055', padding: 8, borderRadius: 20 }}
                                >
                                    <Ionicons name="chevron-back" size={20} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={goToNext}
                                    style={{ position: 'absolute', top: '40%', right: 4, zIndex: 10, backgroundColor: '#00000055', padding: 8, borderRadius: 20 }}
                                >
                                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View
                            style={{
                                backgroundColor: theme.colors.surface,
                                borderRadius: theme.radius.lg,
                                padding: theme.spacing.md,

                                // ✅ 그림자 추가
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.08,
                                shadowRadius: 6,
                                elevation: 3,
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>📝 기도제목</Text>
                            <TouchableOpacity onPress={() => setModalVisible(true)} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>🙏 기도제목 나누기</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={fetchPublicPrayers} style={{ backgroundColor: theme.colors.secondary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>📃 기도제목 보기</Text>
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
