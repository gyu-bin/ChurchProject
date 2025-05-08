// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList, RefreshControl,
    TouchableOpacity, TextInput, Modal, Alert, Linking, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { verses } from '@/assets/verses';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 상단 import
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

    const [user, setUser] = useState<any>(null); // 상태 추가

    useEffect(() => {
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) setUser(JSON.parse(raw));
        };

        const random = Math.floor(Math.random() * verses.length);
        setVerse(verses[random]);
        fetchPrayers();
        loadUser(); // 유저 정보 불러오기
    }, []);

    const fetchPrayers = async () => {
        const q = query(collection(db, 'prayer_requests'), where('visibility', '==', 'all'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPrayers(list);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        // 👇 랜덤으로 다시 뽑기
        setVerse(verses[Math.floor(Math.random() * verses.length)]);
        setYoutubeId(youtubeIds[Math.floor(Math.random() * youtubeIds.length)]);
        await fetchPrayers();

        setRefreshing(false);
    }, []);

    useEffect(() => {
        onRefresh();
    }, []);

    const fetchPublicPrayers = async () => {
        const q = query(collection(db, 'prayer_requests'), where('visibility', '==', 'all'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
                name, title, content, visibility, createdAt: new Date(),
            });
            Alert.alert('기도제목이 제출되었습니다');
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
                        <Text style={styles.header}>🙏 안녕하세요{user?.name ? ` ${user.name}님!` : '!' }</Text>
                        <TouchableOpacity onPress={() => router.push('/notifications')}>
                            <Ionicons name="notifications-outline" size={24} color="#333" />
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

            <Modal visible={viewModalVisible} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>📃 전체 기도제목</Text>

                    <FlatList
                        data={publicPrayers}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },

    scrollContainer: { padding: 20, gap: 20 },
    header: { fontSize: 24, fontWeight: 'bold' },
    // 추가 스타일
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
    verse: { fontSize: 16, fontStyle: 'italic' },
    reference: { fontSize: 14, color: '#555' },
    card: {
        backgroundColor: '#fff', borderRadius: 10, padding: 16,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 12
    },
    thumbnail: { width: '100%', height: 250, borderRadius: 8, marginBottom: 10 },
    prayerButton: {
        backgroundColor: '#10b981', padding: 12, borderRadius: 8,
        marginTop: 12, alignItems: 'center',
    },
    prayerText: { color: '#fff', fontWeight: 'bold' },
    modalContainer: { flex: 1, padding: 24, backgroundColor: '#fff' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: '#f9fafb' },
    submitButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
    submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    closeButton: { alignItems: 'center', padding: 10 },
    closeText: { color: '#333' },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#374151' },
    tag: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
    tagSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    tagText: { fontSize: 14, color: '#111827' },
    tagTextSelected: { color: '#fff', fontWeight: 'bold' },
    refreshButton: {
        backgroundColor: '#e0f2fe',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    }
});
