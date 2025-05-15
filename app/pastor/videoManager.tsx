import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    Image,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform, Keyboard
} from 'react-native';
import { db } from '@/firebase/config';
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,doc
} from 'firebase/firestore';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {Ionicons} from "@expo/vector-icons";

export default function VideoManager() {
    const [videos, setVideos] = useState<any[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const { colors, spacing, font } = useDesign();
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const fetchVideos = async () => {
        const snapshot = await getDocs(collection(db, 'videos'));
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        setVideos(list);
    };

    const addVideo = async () => {
        Keyboard.dismiss();
        if (!newUrl.trim()) return;
        const match = newUrl.match(/v=([^&]+)/);
        const id = match ? match[1] : '';

        try {
            // ✅ 현재 영상 수 가져오기
            const snapshot = await getDocs(collection(db, 'videos'));
            const currentCount = snapshot.size;

            // ✅ Firestore에 새 영상 추가 (order 포함)
            await addDoc(collection(db, 'videos'), {
                url: newUrl.trim(),
                thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
                createdAt: new Date(),
                order: currentCount + 1, // ← 여기서 사용
            });

            setNewUrl('');
            fetchVideos();
        } catch (err) {
            Alert.alert('오류', '영상 추가에 실패했습니다.');
        }
    };

    const deleteVideo = async (id: string) => {
        try {
            const ref = doc(db, 'videos', id); // ✅ 'videos/id' 경로의 문서 참조
            await deleteDoc(ref);
            fetchVideos(); // 다시 목록 불러오기
        } catch (err) {
            Alert.alert('삭제 실패', '영상을 삭제할 수 없습니다.');
        }
    };

    const handleSave = () => {
        router.replace('/settings');
    };

    useEffect(() => {
        fetchVideos();
    }, []);
// 📺 홈화면 영상 관리
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#fff' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={{ padding: spacing.md }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: spacing.lg,
                            marginTop: Platform.OS === 'android' ? insets.top+20 : insets.top,
                            paddingBottom: 30
                        }}
                    >
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: font.heading, fontWeight: '600', color: colors.text, textAlign: 'center', flex: 1,}}>
                            홈화면 영상 관리
                        </Text>
                    </View>

                    {/* 입력창 + 추가 버튼 */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                        <TextInput
                            value={newUrl}
                            onChangeText={setNewUrl}
                            placeholder="유튜브 링크 입력"
                            placeholderTextColor={isDark ? '#9ca3af' : '#888'}
                            style={{
                                flex: 1,
                                borderWidth: 1,
                                borderColor: isDark ? '#374151' : '#ccc',
                                backgroundColor: isDark ? '#1f2937' : '#fff',
                                color: isDark ? '#f3f4f6' : '#111827',
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                            }}
                        />
                        <TouchableOpacity
                            onPress={addVideo}
                            style={{
                                marginLeft: spacing.sm,
                                backgroundColor: '#2563eb',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 8,
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>추가</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 영상 리스트 */}
                    <FlatList
                        data={videos}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        renderItem={({ item }) => (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: isDark ? '#374151' : '#ccc',
                                    backgroundColor: isDark ? '#1f2937' : '#f9f9f9',
                                    borderRadius: 10,
                                    padding: spacing.sm,
                                    marginBottom: spacing.sm,
                                }}
                            >
                                <Image
                                    source={{ uri: item.thumbnail }}
                                    style={{
                                        width: 80,
                                        height: 50,
                                        borderRadius: 8,
                                        marginRight: spacing.md,
                                        backgroundColor: '#ccc',
                                    }}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={{ flex: 1, color: isDark ? '#f3f4f6' : '#111827' }}
                                >
                                    {item.url}
                                </Text>
                                <TouchableOpacity onPress={() => deleteVideo(item.id)}>
                                    <Text style={{ color: 'red', marginLeft: 8 }}>삭제</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />

                    {/* 저장 버튼 */}
                    <TouchableOpacity
                        onPress={handleSave}
                        style={{
                            position: 'absolute',
                            bottom: insets.bottom + 16,
                            left: spacing.md,
                            right: spacing.md,
                            backgroundColor: '#10b981',
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>💾 저장</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
