// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList, RefreshControl,
    TouchableOpacity, TextInput, Modal, Alert, Linking, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { verses } from '@/assets/verses';
import { collection, addDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPushNotification, sendNotification } from '@/services/notificationService';

const youtubeIds = ["hWvJdJ3Da6o", "GT5qxS6ozWU", "E3jJ02NDYCY"];

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
        const q = query(collection(db, 'prayer_requests'), where('visibility', '==', 'all'));
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
        if (!name || !title || !content) {
            Alert.alert('모든 항목을 작성해주세요');
            return;
        }

        try {
            await addDoc(collection(db, 'prayer_requests'), {
                name,
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
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>🙏 {item.title}</Text>
                        <Text style={{ color: '#6b7280' }}>by {item.name}</Text>
                    </View>
                )}
            />

            <Modal visible={modalVisible} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>🙏 기도제목 나누기</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이름</Text>
                        <TextInput placeholder="이름을 입력하세요" value={name} onChangeText={setName} style={styles.input} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>제목</Text>
                        <TextInput placeholder="제목을 입력하세요" value={title} onChangeText={setTitle} style={styles.input} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>기도 내용</Text>
                        <TextInput placeholder="기도 제목을 입력하세요" value={content} onChangeText={setContent} multiline style={[styles.input, { height: 100, textAlignVertical: 'top' }]} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>공개 범위</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={() => setVisibility('all')} style={[styles.tag, visibility === 'all' && styles.tagSelected]}>
                                <Text style={[styles.tagText, visibility === 'all' && styles.tagTextSelected]}>전체공개</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setVisibility('pastor')} style={[styles.tag, visibility === 'pastor' && styles.tagSelected]}>
                                <Text style={[styles.tagText, visibility === 'pastor' && styles.tagTextSelected]}>교역자만</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity onPress={submitPrayer} style={styles.submitButton}>
                        <Text style={styles.submitText}>🙏 제출하기</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                        <Text style={styles.closeText}>닫기</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>

            <Modal visible={viewModalVisible} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>📃 전체 기도제목</Text>

                    <FlatList
                        data={publicPrayers}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={[styles.card, { marginBottom: 12 }]}>
                                <Text style={styles.sectionTitle}>🙏 {item.title}</Text>
                                <Text style={{ color: '#6b7280' }}>by {item.name}</Text>
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
// ✅ 전체적인 파스텔톤 UI를 적용한 스타일 개선
// 아래 styles 객체를 기존 index.tsx에 그대로 대체하세요

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

    modalContainer: { flex: 1, padding: 24, backgroundColor: '#f9fbff' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 20 },

    input: {
        borderWidth: 1,
        borderColor: '#c7d2fe',
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        backgroundColor: '#fff',
        fontSize: 16,
    },

    submitButton: {
        backgroundColor: '#1d4ed8',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    submitText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },

    closeButton: { alignItems: 'center', padding: 10 },
    closeText: { color: '#1e3a8a', fontWeight: 'bold' },

    inputGroup: { marginBottom: 16 },
    label: { fontSize: 15, fontWeight: '600', marginBottom: 6, color: '#1e3a8a' },

    tag: {
        borderWidth: 1,
        borderColor: '#a5b4fc',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    tagSelected: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    tagText: { fontSize: 14, color: '#1e3a8a' },
    tagTextSelected: { color: '#fff', fontWeight: 'bold' },

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
});
