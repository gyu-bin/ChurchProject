import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    FlatList,
    Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/app/context/ThemeContext';
import { useDesign } from '@/app/context/DesignSystem';
import { useAppSelector } from '@/hooks/useRedux';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function DepartmentPostCreate() {
    const { colors, spacing, font } = useDesign();
    const insets = useSafeAreaInsets();
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);

    useEffect(() => {
        let unsubscribe: () => void;
        const listenUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (!raw) return;
            const cachedUser = JSON.parse(raw);
            const userRef = doc(db, 'users', cachedUser.email);
            unsubscribe = onSnapshot(userRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const fresh = { ...docSnap.data(), email: cachedUser.email };
                    setUserInfo(fresh);
                    await AsyncStorage.setItem('currentUser', JSON.stringify(fresh));
                }
            });
        };
        listenUser();
        return () => unsubscribe && unsubscribe();
    }, []);

    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('권한 필요', '이미지 라이브러리에 접근 권한이 필요합니다.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            allowsMultipleSelection: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            selectionLimit: 5,
        });
        if (!result.canceled) {
            const uris = result.assets.map((asset) => asset.uri);
            setImages((prev) => [...prev, ...uris].slice(0, 5));
        }
    };

    const removeImage = (uriToDelete: string) => {
        setImages((prev) => prev.filter((uri) => uri !== uriToDelete));
    };

    const uploadPost = async () => {
        if (!content) {
            Alert.alert('입력 오류', '제목과 내용을 입력해주세요.');
            return;
        }
        setUploading(true);
        try {
            const imageUrls: string[] = [];
            for (const uri of images) {
                const response = await fetch(uri);
                const blob = await response.blob();
                const filename = `${userInfo.email}_${uuid.v4()}`;
                const storageRef = ref(storage, `department_posts/${filename}`);
                await uploadBytes(storageRef, blob);
                const url = await getDownloadURL(storageRef);
                imageUrls.push(url);
                console.log('url'+url)
                console.log('imageUrls'+imageUrls)
            }
            const postId = uuid.v4().toString();
            await setDoc(doc(db, 'department_posts', postId), {
                id: postId,
                content,
                imageUrls,
                createdAt: Timestamp.now(),
                author: {
                    id: userInfo.email,
                    name: userInfo.name,
                    division: userInfo.division,
                    campus: userInfo.campus,
                },
            });
            Alert.alert('성공', '게시물이 등록되었습니다.');
            setContent('');
            setImages([]);
        } catch (err) {
            console.error(err);
            Alert.alert('업로드 실패', '게시물 등록 중 오류가 발생했습니다.');
        }
        setUploading(false);
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}
            contentContainerStyle={{ padding: spacing.md }}
        >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: font.title, fontWeight: 'bold',color: colors.text }}>게시글 생성</Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            <Text style={{ color: '#666', fontSize: 14, marginBottom: spacing.md }}>
                👤 {userInfo?.name} ・ {userInfo?.division} ・ {userInfo?.campus}
            </Text>

            <TouchableOpacity
                style={{
                    backgroundColor: '#f3f4f6',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    padding: spacing.md,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                    marginBottom: spacing.md,
                }}
                onPress={pickImages}
            >
                <Ionicons name="camera-outline" size={20} color="#3b82f6" />
                <Text style={{ color: '#3b82f6', fontWeight: '600' }}>사진 선택 (최대 5장)</Text>
            </TouchableOpacity>

            <FlatList
                data={images}
                keyExtractor={(uri) => uri}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: spacing.md }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onLongPress={() =>
                            Alert.alert('사진 삭제', '이 사진을 삭제하시겠습니까?', [
                                { text: '취소', style: 'cancel' },
                                { text: '삭제', style: 'destructive', onPress: () => removeImage(item) },
                            ])
                        }
                    >
                        <Image
                            source={{ uri: item }}
                            style={{ width: 80, height: 80, borderRadius: 12, marginRight: 10 }}
                        />
                    </TouchableOpacity>
                )}
            />

            <TextInput
                placeholder="내용을 입력해주세요..."
                value={content}
                onChangeText={setContent}
                multiline
                style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: 15,
                    minHeight: 120,
                    textAlignVertical: 'top',
                    marginBottom: spacing.lg,
                }}
            />

            <TouchableOpacity
                onPress={uploadPost}
                disabled={uploading}
                style={{
                    backgroundColor: uploading ? '#ccc' : '#2563eb',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                }}
            >
                {uploading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>🚀 등록하기</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
