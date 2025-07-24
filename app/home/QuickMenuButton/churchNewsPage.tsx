import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';
import { getLinkPreview } from 'link-preview-js';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Toast from "react-native-root-toast";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const types = ['공지', '부고', '축하'];

export default function ChurchNewsPage({ url }: { url: string }) {
    const router = useRouter();
    const { colors, spacing, font } = useDesign();
    const [selectedType, setSelectedType] = useState('공지');
    const { data: posts = [], isLoading } = useQuery<any[]>({
        queryKey: ['churchNewsPosts'],
        queryFn: async () => {
            const q = query(collection(db, 'church_news'));
            const snap = await getDocs(q);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
    const [user, setUser] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    // 작성 form
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [newType, setNewType] = useState('공지');
    const [link, setLink] = useState('');
    const isAuthor = (post: any) => user && post.author === user?.name;

    const [previewMeta, setPreviewMeta] = useState<{ title?: string; description?: string; image?: string } | null>(null);
    const [previewMap, setPreviewMap] = useState<Record<string, { title?: string; image?: string; description?: string }>>({});

    useEffect(() => {
        const fetchMeta = async () => {
            if (!selectedPost?.link) {
                setPreviewMeta(null);
                return;
            }

            try {
                const data = await getLinkPreview(selectedPost.link);
                // title이나 image가 있는지 체크 후 저장
                if ('title' in data || 'images' in data) {
                    const title = 'title' in data ? data.title : undefined;
                    const image = 'images' in data && Array.isArray(data.images) ? data.images[0] : undefined;
                    const description = 'description' in data ? data.description : undefined;
                    setPreviewMeta({ title, image, description });
                } else {
                    setPreviewMeta(null);
                }
            } catch (e) {
                console.log('링크 미리보기 오류', e);
                setPreviewMeta(null);
            }
        };

        fetchMeta();
    }, [selectedPost?.link]);

    useEffect(() => {
        const fetchAllPreviews = async () => {
            const previews = { ...previewMap }; // 🟢 기존 캐시 데이터 유지

            for (const post of posts) {
                if (!post.link) continue;

                // 이미 캐시에 있으면 fetch skip
                if (previews[post.id]) continue;

                try {
                    const data = await getLinkPreview(post.link);
                    if ('title' in data || 'images' in data) {
                        const title = 'title' in data ? data.title : undefined;
                        const image = 'images' in data && Array.isArray(data.images) ? data.images[0] : undefined;
                        const description = 'description' in data ? data.description : undefined;

                        previews[post.id] = { title, image, description };
                    }
                } catch (e) {
                    console.log('링크 미리보기 오류:', post.link, e);
                }
            }

            setPreviewMap(previews);
        };

        if (posts.length > 0) {
            fetchAllPreviews();
        }
    }, [posts]);

    useEffect(() => {
        const fetchUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            setUser(parsed);
        };
        fetchUser();
    }, []);

    // useEffect(() => {
    //     const q = query(collection(db, 'church_news'), where('type', '==', selectedType));
    //     const unsubscribe = onSnapshot(q, snapshot => {
    //         // This useEffect is now redundant as posts are fetched via useQuery
    //         // but keeping it for now to avoid breaking existing logic if it were to be re-added.
    //         // The useQuery will handle updates.
    //     });
    //     return () => unsubscribe();
    // }, [selectedType]);

    const handleSubmit = async () => {
        if (!title || !content) return;

        if (selectedPost) {
            // 수정 모드일 경우
            await updateDoc(doc(db, 'church_news', selectedPost.id), {
                title,
                content,
                type: newType,
                link,
                date: serverTimestamp(), // 수정 시간도 업데이트
            });
        } else {
            // 새 글 작성
            await addDoc(collection(db, 'church_news'), {
                title,
                content,
                type: newType || selectedType,
                date: serverTimestamp(),
                author: user?.name,
                authorEmail: user?.email || '',
                link
            });
        }

        // 초기화
        setTitle('');
        setContent('');
        setNewType('공지');
        setLink('');
        setSelectedPost(null); // 수정 모드 종료
        setShowModal(false);
        Toast.show('저장되었습니다.')
    };

    const handleDelete = async (id: string) => {
        Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                onPress: async () => {
                    await deleteDoc(doc(db, 'church_news', id));
                    Toast.show('삭제되었습니다.')
                },
                style: 'destructive',
            },
        ]);
    };
    const allowedRoles = ['관리자', '교역자'];
    const canDelete = (post: any) =>
        user && (allowedRoles.includes(user?.role) || post.authorEmail === user?.email);

    const insets = useSafeAreaInsets();

    const filteredPosts = posts.filter(post => post.type === selectedType);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* ✅ 상단 헤더 */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.md,
                paddingTop: Platform.OS === 'android' ? 40 : 60,
                paddingBottom: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ color: colors.text, fontSize: 30 }}>←</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>시광 뉴스</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* ✅ 상단 탭 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm }}>
                {types.map(t => (
                    <TouchableOpacity key={t} onPress={() => setSelectedType(t)}>
                        <Text style={{
                            fontWeight: selectedType === t ? 'bold' : 'normal',
                            color: selectedType === t ? colors.primary : colors.text,
                            fontSize: font.title,
                            padding: 10
                        }}>
                            {t}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ✅ 뉴스 리스트 */}
            <FlatList
                data={filteredPosts}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: spacing.md }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => setSelectedPost(item)}
                        style={{
                            backgroundColor: colors.surface,
                            borderRadius: 10,
                            padding: 16,
                            marginBottom: 12,
                        }}
                    >
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>{item.title}</Text>
                        <Text numberOfLines={2} style={{ color: colors.subtext, fontSize: 14, marginTop: 6 }}>
                            {item.content.length > 50 ? `${item.content.slice(0, 50)}...` : item.content}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 4 }}>
                            작성자: {item.author} / 작성일: {new Date(item.date?.seconds * 1000).toLocaleDateString()}
                        </Text>
                        {item.link && previewMap[item.id] && (
                            <TouchableOpacity onPress={() => Linking.openURL(item.link)}>
                                <View style={{
                                    borderWidth: 1,
                                    borderColor: '#ccc',
                                    borderRadius: 8,
                                    padding: 10,
                                    marginTop: 10,
                                    backgroundColor: '#fff'
                                }}>
                                    {previewMap[item.id].image && (
                                        <Image
                                            source={{ uri: previewMap[item.id].image }}
                                            style={{ width: '100%', height: 300, borderRadius: 6 }}
                                            cachePolicy="disk"
                                            contentFit="cover"
                                        />
                                    )}
                                    <Text style={{ fontWeight: 'bold', marginTop: 10 }}>{previewMap[item.id].title || item.link}</Text>
                                    {previewMap[item.id].description && (
                                        <Text style={{ color: '#666', marginTop: 4 }} numberOfLines={2}>{previewMap[item.id].description}</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}

                        {(canDelete(item) || isAuthor(item)) && (
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                                {isAuthor(item) && (
                                    <TouchableOpacity onPress={() => {
                                        setSelectedPost(item);
                                        setTitle(item.title);
                                        setContent(item.content);
                                        setNewType(item.type);
                                        setLink(item.link);
                                        setShowEditModal(true);
                                    }}>
                                        <Text style={{ fontSize:font.title,color: colors.primary, marginRight: 16 }}>수정</Text>
                                    </TouchableOpacity>
                                )}
                                {canDelete(item) && (
                                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                        <Text style={{ fontSize:font.title,color: 'red' }}>삭제</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            />

            {/* ✅ 작성 버튼 */}
            {(user?.role === '교역자' || user?.role === '관리자' || user?.role === '임원') && (
                <TouchableOpacity
                    onPress={() => {
                        setTitle('');
                        setContent('');
                        setLink('');        // 🟢 link 초기화
                        setNewType(selectedType);
                        setSelectedPost(null);
                        setShowModal(true);
                    }}
                    style={{
                        backgroundColor: colors.primary,
                        marginHorizontal: spacing.md,
                        padding: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        marginBottom: spacing.xl
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>작성하기</Text>
                </TouchableOpacity>
            )}

            {/* ✅ 전체보기 모달 */}
            <Modal visible={!!selectedPost && !showEditModal && !showModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20, maxHeight: '80%' }}>
                        <ScrollView>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>{selectedPost?.title}</Text>
                            <Text style={{ fontSize: 14, color: colors.subtext, marginVertical: 10 }}>
                                {selectedPost?.content}
                            </Text>

                            {selectedPost?.link && previewMeta && (
                                <TouchableOpacity onPress={() => Linking.openURL(selectedPost.link)}>
                                    <View style={{
                                        borderWidth: 1,
                                        borderColor: '#ccc',
                                        borderRadius: 8,
                                        padding: 10,
                                        marginTop: 10,
                                        backgroundColor: '#fff'
                                    }}>
                                        {previewMeta.image && (
                                            <Image
                                                source={{ uri: previewMeta.image }}
                                                style={{ width: '100%', height: 120, borderRadius: 6 }}
                                                cachePolicy="disk"
                                                contentFit="cover"
                                            />
                                        )}
                                        <Text style={{ fontWeight: 'bold', marginTop: 10 }}>{previewMeta.title || selectedPost.link}</Text>
                                        {previewMeta.description && (
                                            <Text style={{ color: '#666', marginTop: 4 }} numberOfLines={2}>{previewMeta.description}</Text>
                                        )}
                                        {/*<Text style={{ color: '#1d4ed8', marginTop: 4 }}>{selectedPost.link}</Text>*/}
                                    </View>
                                </TouchableOpacity>
                            )}

                        </ScrollView>
                        <TouchableOpacity onPress={() => setSelectedPost(null)} style={{ marginTop: 20 }}>
                            <Text style={{ textAlign: 'center', color: colors.primary }}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ✅ 작성 모달 */}
            <Modal visible={showModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={0}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{
                            backgroundColor: colors.background,
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -3 },
                            shadowOpacity: 0.1,
                            shadowRadius: 10,
                            elevation: 10,
                            minHeight: 320,
                            maxHeight: '90%',
                            paddingHorizontal: 20
                        }}>
                            {/* 드래그바 */}
                            <View style={{ width: 40, height: 5, borderRadius: 2.5, backgroundColor: '#ccc', alignSelf: 'center', marginTop: 8, marginBottom: 16 }} />
                            <ScrollView
                                contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 24 }}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {/* 헤더 */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>게시글 작성</Text>
                                    <TouchableOpacity onPress={() => setShowModal(false)}>
                                        <Ionicons name='close' size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>
                                {/* 입력창 */}
                                <TextInput
                                    placeholder="제목을 입력하세요"
                                    value={title}
                                    onChangeText={setTitle}
                                    style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                                    placeholderTextColor="#aaa"
                                />
                                <TextInput
                                    placeholder="내용을 입력하세요"
                                    value={content}
                                    onChangeText={setContent}
                                    multiline
                                    style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, minHeight: 120, marginBottom: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top' }}
                                    placeholderTextColor="#aaa"
                                />
                                <TextInput
                                    placeholder="관련 링크 (선택사항)"
                                    value={link}
                                    onChangeText={setLink}
                                    style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                                    placeholderTextColor="#aaa"
                                    autoCapitalize="none"
                                    keyboardType="url"
                                />
                                {/* 버튼 */}
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    style={{ backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, marginBottom: 8, alignItems: 'center' }}
                                >
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>작성 완료</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            {/* ✅ 수정 모달 */}
            <Modal visible={showEditModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={0}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{
                            backgroundColor: colors.background,
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            paddingBottom: insets.bottom || 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -3 },
                            shadowOpacity: 0.1,
                            shadowRadius: 10,
                            elevation: 10,
                            minHeight: 320,
                            maxHeight: '90%',
                        }}>
                            {/* 드래그바 */}
                            <View style={{ width: 40, height: 5, borderRadius: 2.5, backgroundColor: '#ccc', alignSelf: 'center', marginTop: 8, marginBottom: 16 }} />
                            <ScrollView
                                contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 24 }}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {/* 헤더 */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>게시글 수정</Text>
                                    <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                        <Ionicons name='close' size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>
                                {/* 입력창 */}
                                <TextInput
                                    placeholder="제목을 입력하세요"
                                    value={title}
                                    onChangeText={setTitle}
                                    style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                                    placeholderTextColor="#aaa"
                                />
                                <TextInput
                                    placeholder="내용을 입력하세요"
                                    value={content}
                                    onChangeText={setContent}
                                    multiline
                                    style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, minHeight: 120, marginBottom: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top' }}
                                    placeholderTextColor="#aaa"
                                />
                                <TextInput
                                    placeholder="관련 링크 (선택사항)"
                                    value={link}
                                    onChangeText={setLink}
                                    style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                                    placeholderTextColor="#aaa"
                                    autoCapitalize="none"
                                    keyboardType="url"
                                />
                                {/* 버튼 */}
                                <TouchableOpacity
                                    onPress={async () => {
                                        if (!title.trim() || !content.trim()) {
                                            Toast.show('제목과 내용을 모두 입력해주세요.');
                                            return;
                                        }
                                        if (!selectedPost?.id) {
                                            Toast.show('수정할 게시글이 없습니다.');
                                            return;
                                        }
                                        try {
                                            await updateDoc(doc(db, 'church_news', selectedPost.id), {
                                                title: title.trim(),
                                                content: content.trim(),
                                                type: newType || selectedType,
                                                date: serverTimestamp(),
                                            });
                                            setTitle('');
                                            setContent('');
                                            setNewType('공지');
                                            setSelectedPost(null);
                                            setShowEditModal(false);
                                            Toast.show('수정되었습니다.');
                                        } catch (err) {
                                            console.error('update 실패:', err);
                                            Toast.show('수정에 실패했습니다.');
                                        }
                                    }}
                                    style={{ backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, marginBottom: 8, alignItems: 'center' }}
                                >
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>수정 완료</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
