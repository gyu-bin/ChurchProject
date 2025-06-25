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
import RNPickerSelect from 'react-native-picker-select';
import * as ImageManipulator from "expo-image-manipulator";
import type {ImagePickerAsset} from "expo-image-picker";


export default function DepartmentPostCreate() {
    const { colors, spacing, font } = useDesign();
    const insets = useSafeAreaInsets();
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);

    const [campus, setCampus] = useState('');
    const [division, setDivision] = useState('');

    const campusOptions = ['문래', '신촌','시선교회'];
    const divisionOptions = ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'];
    const [selectedCampus, setSelectedCampus] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');

    const [imageURLs, setImageURLs] = useState<ImagePickerAsset[]>([]);

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

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('권한 필요', '이미지 라이브러리에 접근 권한이 필요합니다.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 5,
            allowsEditing: false,
            quality: 0.8,
            base64: false,
        });

        if (!result.canceled && result.assets.length > 0) {
            // 기존 이미지 포함 최대 5장까지 제한
            setImageURLs((prev) => [...prev, ...result.assets].slice(0, 5));
        }
    };

    const uploadImageToFirebase = async (imageUri: string): Promise<string> => {
        try {
            // 이미지 조작 (크기 그대로, 포맷만 JPEG으로 확실히 지정)
            const manipulated = await ImageManipulator.manipulateAsync(
                imageUri,
                [],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            const response = await fetch(manipulated.uri);
            const blob = await response.blob();

            const filename = `uploads/${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, blob, {
                contentType: 'image/jpeg',
            });

            const downloadUrl = await getDownloadURL(storageRef);
            return downloadUrl;
        } catch (err) {
            console.error('🔥 업로드 실패:', err);
            throw err;
        }
    };

    const uploadPost = async () => {
        if (!content.trim()) {
            Alert.alert('입력 오류', '내용을 입력해주세요.');
            return;
        }

        if (!selectedCampus || !selectedDivision) {
            Alert.alert('입력 오류', '캠퍼스와 부서를 선택해주세요.');
            return;
        }

        setUploading(true);

        try {
            const downloadUrls: string[] = [];

            for (const image of imageURLs) {
                const downloadUrl = await uploadImageToFirebase(image.uri);
                downloadUrls.push(downloadUrl);
            }

            const postId = uuid.v4().toString();

            await setDoc(doc(db, 'department_posts', postId), {
                id: postId,
                content,
                campus: selectedCampus,
                division: selectedDivision,
                imageUrls: downloadUrls,
                createdAt: Timestamp.now(),
                author: {
                    id: userInfo.email,
                    name: userInfo.name,
                    campus: userInfo.campus,
                    division: userInfo.division,
                },
            });

            Alert.alert('성공', '게시물이 등록되었습니다.');

            // 상태 초기화
            setContent('');
            setImageURLs([]);
            setSelectedCampus('');
            setSelectedDivision('');
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

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.md }}>
                {/* 캠퍼스 드롭다운 */}
                <View style={{ flex: 1 }}>
                    <RNPickerSelect
                        onValueChange={(value) => setSelectedCampus(value)}
                        // placeholder={{ label: '캠퍼스', value: null }}
                        items={campusOptions.map((campus) => ({ label: campus, value: campus }))}
                        value={selectedCampus}
                        style={{
                            inputIOS: {
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                borderWidth: 1,
                                borderColor: '#d1d5db',
                                borderRadius: 8,
                                backgroundColor: '#f3f4f6',
                                fontSize: 13,
                            },
                            inputAndroid: {
                                paddingVertical: 4,
                                paddingHorizontal: 8,
                                borderWidth: 1,
                                borderColor: '#d1d5db',
                                borderRadius: 8,
                                backgroundColor: '#f3f4f6',
                                fontSize: 13,
                            },
                        }}
                    />
                </View>

                {/* 부서 드롭다운 */}
                <View style={{ flex: 1 }}>
                    <RNPickerSelect
                        onValueChange={(value) => setSelectedDivision(value)}
                        placeholder={{ label: '부서', value: null }}
                        items={divisionOptions.map((division) => ({ label: division, value: division }))}
                        value={selectedDivision}
                        style={{
                            inputIOS: {
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                borderWidth: 1,
                                borderColor: '#d1d5db',
                                borderRadius: 8,
                                backgroundColor: '#f3f4f6',
                                fontSize: 13,
                            },
                            inputAndroid: {
                                paddingVertical: 4,
                                paddingHorizontal: 8,
                                borderWidth: 1,
                                borderColor: '#d1d5db',
                                borderRadius: 8,
                                backgroundColor: '#f3f4f6',
                                fontSize: 13,
                            },
                        }}
                    />
                </View>
            </View>

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
                onPress={pickImage}
            >
                <Ionicons name="camera-outline" size={20} color="#3b82f6" />
                <Text style={{ color: '#3b82f6', fontWeight: '600' }}>사진 선택 (최대 5장)</Text>
            </TouchableOpacity>

            <FlatList
                data={imageURLs}
                keyExtractor={(item) => item.uri}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: spacing.md }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onLongPress={() =>
                            Alert.alert('사진 삭제', '이 사진을 삭제하시겠습니까?', [
                                { text: '취소', style: 'cancel' },
                                {
                                    text: '삭제',
                                    style: 'destructive',
                                    onPress: () =>
                                        setImageURLs((prev) => prev.filter((img) => img.uri !== item.uri)),
                                },
                            ])
                        }
                    >
                        <Image
                            source={{ uri: item.uri }}
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: 12,
                                marginRight: 10,
                            }}
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
