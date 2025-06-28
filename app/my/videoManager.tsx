// ✅ 드래그 정렬 + 순서 저장 + 순서 표시 + NaN 방지 VideoManager
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    deleteDoc, doc,
    getDocs,
    updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView, Platform,
    SafeAreaView,
    Text, TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import Toast from 'react-native-root-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ✅ 영상 타입 정의
type VideoItem = {
    id: string;
    url: string;
    thumbnail: string;
    order: number;
};

export default function VideoManager() {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const { colors, spacing, font } = useDesign();
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const fetchVideos = async () => {
        const snapshot = await getDocs(collection(db, 'videos'));
        const list: VideoItem[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<VideoItem, 'id'>),
        }));
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setVideos(list);
    };

    const addVideo = async () => {
        Keyboard.dismiss();
        if (!newUrl.trim()) return;
        const match = newUrl.match(/v=([^&]+)/);
        const id = match ? match[1] : '';
        try {
            const snapshot = await getDocs(collection(db, 'videos'));
            const currentCount = snapshot.size;
            await addDoc(collection(db, 'videos'), {
                url: newUrl.trim(),
                thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
                createdAt: new Date(),
                order: currentCount,
            });
            setNewUrl('');
            fetchVideos();
            Toast.show('✅ 영상이 추가되었습니다', { duration: 1500 });
        } catch (err) {
            Alert.alert('오류', '영상 추가에 실패했습니다.');
        }
    };

    const deleteVideo = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'videos', id));
            fetchVideos();
            Toast.show('🗑 삭제 완료', { duration: 1500 });
        } catch (err) {
            Alert.alert('삭제 실패', '영상을 삭제할 수 없습니다.');
        }
    };

    const updateOrder = async (data: VideoItem[]) => {
        await Promise.all(
            data.map((item, index) =>
                updateDoc(doc(db, 'videos', item.id), { order: index })
            )
        );
        Toast.show('💾 순서가 저장되었습니다', { duration: 1500 });
    };

    const handleSave = async () => {
        await updateOrder(videos); // 저장 완료 후
        Toast.show('✅ 순서가 저장되었습니다', { duration: 1500 });
        router.replace('/my');
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top + 20 : 0 }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={{ padding: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: 30 }}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: font.heading, fontWeight: '600', color: colors.text, textAlign: 'center', flex: 1 }}>홈화면 영상 관리</Text>
                    </View>

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

                    <DraggableFlatList<VideoItem>
                        data={videos}
                        keyExtractor={(item) => item.id}
                        onDragEnd={({ data }) => setVideos(data)}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        renderItem={(params: RenderItemParams<VideoItem>) => {
                            const { item, drag } = params;
                            const index = videos.findIndex(v => v.id === item.id); // ✅ index 직접 계산

                            return (
                                <TouchableOpacity
                                    onLongPress={drag}
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
                                    {/* 🔢 순서 숫자 표시 */}
                                    <Text style={{ width: 24, textAlign: 'center', marginRight: spacing.sm, color: colors.primary }}>
                                        {index !== -1 ? `${index + 1}.` : '-'}
                                    </Text>

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
                                    <Text numberOfLines={1} style={{ flex: 1, color: isDark ? '#f3f4f6' : '#111827' }}>
                                        {item.url}
                                    </Text>
                                    <TouchableOpacity onPress={() => deleteVideo(item.id)} style={{ marginLeft: 8 }}>
                                        <Ionicons name="trash" size={20} color={colors.error} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        }}
                    />

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
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>💾 순서 저장</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
