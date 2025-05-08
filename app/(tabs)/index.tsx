// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, SafeAreaView, FlatList, RefreshControl,
    TouchableOpacity, Image, Modal, Alert, Linking
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

const youtubeIds = ["hWvJdJ3Da6o", "GT5qxS6ozWU", "E3jJ02NDYCY"];

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
    const [prayers, setPrayers] = useState<any[]>([]);
    const [publicPrayers, setPublicPrayers] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);

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
        const q = query(
            collection(db, 'prayer_requests'),
            where('visibility', '==', 'all'),
            orderBy('createdAt', 'desc')
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

            Alert.alert('제출 완료', '기도제목이 제출되었습니다.');
            setModalVisible(false);
            setTitle('');
            setContent('');
            setVisibility('all');
            fetchPrayers();
        } catch (err: any) {
            Alert.alert('제출 실패', err.message);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
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

                        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>📺 추천 설교</Text>
                            <TouchableOpacity onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${youtubeId}`)}>
                                <Image source={{ uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` }} style={{ width: '100%', height: 220, borderRadius: theme.radius.md, marginTop: 10 }} />
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
                name={user?.name}
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
                                <Text style={{ fontSize: 13, color: theme.colors.subtext, marginTop: 4, textAlign: 'right' }}>- {item.name}</Text>
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
