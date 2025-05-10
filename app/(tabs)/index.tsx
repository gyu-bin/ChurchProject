// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, SafeAreaView, FlatList, RefreshControl,
    TouchableOpacity, Image, Modal, Alert, Linking,Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { verses } from '@/assets/verses';
import { collection, addDoc, getDocs, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPushNotification, sendNotification } from '@/services/notificationService';
import PrayerModal from '../prayerModal';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

const youtubeIds = ["hWvJdJ3Da6o", "GT5qxS6ozWU", "E3jJ02NDYCY"];

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

    const [verse, setVerse] = useState(verses[0]);
    const [youtubeId, setYoutubeId] = useState(youtubeIds[0]);
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

    const insets = useSafeAreaInsets();


    const screenWidth = Dimensions.get('window').width;
    const thumbnailHeight = screenWidth * 0.56; // 유튜브 16:9 비율 (기본 추천)

    useEffect(() => {
        let unsubscribe: () => void;

        const loadUserAndSubscribeNotifications = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (!raw) return;
            const currentUser = JSON.parse(raw);
            setUser(currentUser);

            try {
                const q = query(
                    collection(db, 'notifications'),
                    where('to', '==', currentUser.email)
                );

                unsubscribe = onSnapshot(q, (snapshot) => {
                    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setNotifications(list);
                });
            } catch (error) {
                console.error('❌ 알림 구독 실패:', error);
            }
        };

        loadUserAndSubscribeNotifications();
        return () => { if (unsubscribe) unsubscribe(); };
    }, []);

    useEffect(() => {
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) setUser(JSON.parse(raw));
        };
        setVerse(verses[Math.floor(Math.random() * verses.length)]);
        loadUser();
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
        try {
            setRefreshing(true);
            setVerse(verses[Math.floor(Math.random() * verses.length)]);
            setYoutubeId(youtubeIds[Math.floor(Math.random() * youtubeIds.length)]);
            await fetchPrayers();  // 반드시 await
        } catch (e) {
            console.error('❌ 리프레시 에러:', e);
        } finally {
            setRefreshing(false); // 완료되든 실패하든 무조건 호출
        }
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

                    // Firestore 알림 저장 (중복 방지)
                    if (pastor?.email && !notifiedEmails.has(pastor.email)) {
                        notifiedEmails.add(pastor.email);

                        notificationPromises.push(
                            sendNotification({
                                to: pastor.email,
                                message: `${user?.name ?? '익명'}님의 기도제목이 등록되었습니다.`,
                                type: 'prayer_private',
                                link: '/pastor/pastor', // ✅ 쿼리 없이 경로만
                                tab: 'prayers',         // ✅ 별도 필드로 전달
                            })
                        );
                    }

                    // 푸시 토큰 수집 (유효성 검사 포함)
                    if (
                        pastor?.expoPushToken &&
                        typeof pastor.expoPushToken === 'string' &&
                        pastor.expoPushToken.startsWith('ExponentPushToken')
                    ) {
                        pushTokens.add(pastor.expoPushToken);
                    }
                }

                // 알림 저장 병렬 처리
                await Promise.all(notificationPromises);

                // 푸시 전송 (중복 제거된 토큰만)
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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background,paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
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

                        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>📖 오늘의 말씀</Text>
                            <Text style={{ fontSize: 16, fontStyle: 'italic', color: theme.colors.subtext }}>{verse.verse}</Text>
                            <Text style={{ fontSize: 14, color: theme.colors.subtext }}>({verse.reference})</Text>
                        </View>

                        <View
                            style={{
                                backgroundColor: theme.colors.surface,
                                borderRadius: theme.radius.lg,
                                padding: theme.spacing.md,
                                width: '100%',
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>
                                📺 추천 설교
                            </Text>
                            <TouchableOpacity
                                onPress={() =>
                                    Linking.openURL(`https://www.youtube.com/watch?v=${youtubeId}`)
                                }
                            >
                                <Image
                                    source={{
                                        uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
                                    }}
                                    style={{
                                        width: '100%',
                                        aspectRatio: 16 / 9, // ✅ 화면 너비 기준 16:9 유지
                                        borderRadius: theme.radius.md,
                                        marginTop: 10,
                                        backgroundColor: '#ccc', // 로딩 시 배경
                                    }}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md }}>
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
                name={user?.name ?? '익명'} // 이름 전달
                title={title}
                content={content}
                visibility={visibility}
                setTitle={setTitle}
                setContent={setContent}
                setVisibility={setVisibility}
            />

            <Modal visible={viewModalVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text, marginBottom: 24 }}>📃 전체 기도제목</Text>
                    <FlatList
                        data={publicPrayers.sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.())}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        renderItem={({ item }) => (
                            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, marginBottom: 12 }}>
                                <Text style={{ fontSize: 17, fontWeight: '600', color: theme.colors.primary }}>🙏 {item.title}</Text>
                                <Text style={{ fontSize: 16, color: theme.colors.text, marginTop: 6 }}>{item.content}</Text>
                                <Text style={{ fontSize: 13, color: theme.colors.subtext, marginTop: 4, textAlign: 'right' }}>
                                    - {item.name ?? '익명'}
                                </Text>
                            </View>
                        )}
                    />
                    <TouchableOpacity onPress={() => setViewModalVisible(false)} style={{ alignItems: 'center', marginTop: 20, backgroundColor: theme.colors.border, padding: 14, borderRadius: 12 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>닫기</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
