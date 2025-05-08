// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList, RefreshControl,
    TouchableOpacity, TextInput, Modal, Alert, Linking, Image,KeyboardAvoidingView,Platform,
    Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { verses } from '@/assets/verses';
import { collection, addDoc, getDocs, query, where, onSnapshot,orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPushNotification, sendNotification } from '@/services/notificationService';
import PrayerModal from '../prayerModal'
const youtubeIds = ["hWvJdJ3Da6o", "GT5qxS6ozWU", "E3jJ02NDYCY"];
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
    const router = useRouter();
    const [verse, setVerse] = useState(verses[0]);
    const [youtubeId, setYoutubeId] = useState(youtubeIds[0]);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState<'all' | 'pastor'>('all');
    const [prayers, setPrayers] = useState<any[]>([]);
    const [publicPrayers, setPublicPrayers] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);

    //알람개수
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
                    where('to', '==', currentUser.email),
                    // orderBy('createdAt', 'desc') // 🔥 최신순 정렬 (인덱스 필요할 수 있음)
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

        // ✅ 구독 해제
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);
    //사용자
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
        const q = query(
            collection(db, 'prayer_requests'),
            where('visibility', '==', 'all'),
            orderBy('createdAt', 'desc') // ✅ 최근순 정렬
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPrayers(list);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setVerse(verses[Math.floor(Math.random() * verses.length)]);
        setYoutubeId(youtubeIds[Math.floor(Math.random() * youtubeIds.length)]);
        await fetchPrayers();
        setRefreshing(false);
    }, []);

    const fetchPublicPrayers = async () => {
        const q = query(collection(db, 'prayer_requests'), where('visibility', '==', 'all'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('✅ 공개 기도제목 수:', list.length); // 로그 추가
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
                title,
                content,
                visibility,
                createdAt: new Date(),
            });

            // ✅ 비공개 기도제목 -> 교역자 알림 전송
            if (visibility === 'pastor') {
                const q = query(collection(db, 'users'), where('role', '==', '교역자'));
                const snap = await getDocs(q);
                snap.docs.forEach(async (docSnap) => {
                    const pastor = docSnap.data();

                    await sendNotification({
                        to: pastor.email,
                        message: `${name}님의 기도제목이 등록되었습니다.`,
                        type: 'prayer_private',
                        link: '/pastor?tab=prayers',
                    });

                    if (pastor.expoPushToken) {
                        await sendPushNotification({
                            to: pastor.expoPushToken,
                            title: '🙏 새로운 기도제목',
                            body: `${name}님의 기도제목`,
                        });
                    }
                });
            }

            Alert.alert('제출 완료', '기도제목이 제출되었습니다.');
            setModalVisible(false);
            setName('');
            setTitle('');
            setContent('');
            setVisibility('all');
            fetchPrayers();
        } catch (err: any) {
            Alert.alert('제출 실패', err.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <FlatList
                ListHeaderComponent={(
                    <View style={styles.scrollContainer}>
                        <View style={styles.headerRow}>
                            <Text style={styles.header}>🙏 안녕하세요{user?.name ? ` ${user.name}님!` : '!'}</Text>
                            <TouchableOpacity onPress={() => router.push('/notifications')} style={{ position: 'relative' }}>
                                <Ionicons name="notifications-outline" size={24} color="#333" />
                                {notifications.length > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{notifications.length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>📖 오늘의 말씀</Text>
                            <Text style={styles.verse}>{verse.verse}</Text>
                            <Text style={styles.reference}>({verse.reference})</Text>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>📺 추천 설교</Text>
                            <TouchableOpacity onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${youtubeId}`)}>
                                <Image
                                    source={{ uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` }}
                                    style={styles.thumbnail}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>📝 기도제목</Text>
                            <TouchableOpacity style={styles.prayerButton} onPress={() => setModalVisible(true)}>
                                <Text style={styles.prayerText}>🙏 기도제목 나누기</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.prayerButton, { backgroundColor: '#3b82f6' }]} onPress={fetchPublicPrayers}>
                                <Text style={styles.prayerText}>📃 기도제목 보기</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                data={prayers}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={({ item }) => (
                    <View style={styles.card} />
                )}
            />

            <PrayerModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSubmit={submitPrayer}
                name={user?.name}
                title={title}
                content={content}
                visibility={visibility}
                setTitle={setTitle}
                setContent={setContent}
                setVisibility={setVisibility}
            />

            <Modal visible={viewModalVisible} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>📃 전체 기도제목</Text>

                    <FlatList
                        data={publicPrayers.sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.())} // ✅ 최신순 정렬
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        renderItem={({ item }) => (
                            <View style={[styles.card, { marginBottom: 12 }]}>
                                <Text style={styles.sectionTitle}>🙏 {item.title}</Text>
                                <Text style={styles.content}>{item.content}</Text>
                                <Text style={styles.name}>- {item.name}</Text>
                            </View>
                        )}
                    />

                    <TouchableOpacity onPress={() => setViewModalVisible(false)} style={styles.closeButton}>
                        <Text style={styles.closeText}>닫기</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4ff' },
    scrollContainer: { padding: 20, gap: 20 },
    header: { fontSize: 24, fontWeight: 'bold', color: '#3182f6' },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 6 },
    verse: { fontSize: 16, fontStyle: 'italic', color: '#374151' },
    reference: { fontSize: 14, color: '#6b7280' },

    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e7ff',
    },

    thumbnail: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: '#e0f2fe',
    },

    prayerButton: {
        backgroundColor: '#3b82f6',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },

    prayerText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
        badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#2563eb',
        borderRadius: 12,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    //모달
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 40,
        textAlign: 'left',
    },
    formGroup: {
        marginBottom: 32,
    },
    underlineInput: {
        fontSize: 18,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: '#e5e7eb',
        color: '#111827',
    },
    visibilityGroup: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 32,
    },
    tag: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    tagSelected: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    tagText: {
        fontSize: 14,
        color: '#374151',
    },
    tagTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: '#3182f6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    submitText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    closeButton: {
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
    },
    closeText: {
        color: '#374151',
        fontSize: 15,
        fontWeight: '500',
    },
    content: {
        fontSize: 20,
        color: '#374151',
        marginTop: 6,
    },
    name: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 4,
        textAlign: 'right',
    },
});

