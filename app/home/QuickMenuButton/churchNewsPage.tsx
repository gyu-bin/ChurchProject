import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Modal, ScrollView, TextInput, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from "react-native-root-toast";

const types = ['공지', '부고', '축하'];

export default function ChurchNewsPage() {
    const router = useRouter();
    const { colors, spacing, font } = useDesign();
    const [selectedType, setSelectedType] = useState('공지');
    const [posts, setPosts] = useState<any[]>([]);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
    const [user, setUser] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    // 작성 form
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [newType, setNewType] = useState('공지');

    const isAuthor = (post: any) => user && post.author === user?.name;

    useEffect(() => {
        const fetchUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            setUser(parsed);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'church_news'), where('type', '==', selectedType));
        const unsubscribe = onSnapshot(q, snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(data);
        });
        return () => unsubscribe();
    }, [selectedType]);

    const handleSubmit = async () => {
        if (!title || !content) return;

        if (selectedPost) {
            // 수정 모드일 경우
            await updateDoc(doc(db, 'church_news', selectedPost.id), {
                title,
                content,
                type: newType,
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
            });
        }

        // 초기화
        setTitle('');
        setContent('');
        setNewType('공지');
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
    const allowedRoles = ['관리자', '교역자', '임원'];
    const canDelete = (post: any) =>
        user && (allowedRoles.includes(user?.role) || post.authorEmail === user?.email);

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
                    <Text style={{ color: colors.text, fontSize: 16 }}>←</Text>
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
                            color: selectedType === t ? colors.primary : colors.text
                        }}>
                            {t}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ✅ 뉴스 리스트 */}
            <FlatList
                data={posts}
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

                        {(canDelete(item) || isAuthor(item)) && (
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                                {isAuthor(item) && (
                                    <TouchableOpacity onPress={() => {
                                        setSelectedPost(item);
                                        setTitle(item.title);
                                        setContent(item.content);
                                        setNewType(item.type);
                                        setShowEditModal(true);
                                    }}>
                                        <Text style={{ color: colors.primary, marginRight: 16 }}>수정</Text>
                                    </TouchableOpacity>
                                )}
                                {canDelete(item) && (
                                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                        <Text style={{ color: 'red' }}>삭제</Text>
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
                    onPress={() => setShowModal(true)}
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
                        </ScrollView>
                        <TouchableOpacity onPress={() => setSelectedPost(null)} style={{ marginTop: 20 }}>
                            <Text style={{ textAlign: 'center', color: colors.primary }}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ✅ 작성 모달 */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20 }}>
                        <TextInput
                            placeholder="제목"
                            value={title}
                            onChangeText={setTitle}
                            style={{ borderBottomWidth: 1, marginBottom: 12, fontSize: 16, color: colors.text }}
                            placeholderTextColor="#ccc"
                        />
                        <TextInput
                            placeholder="내용"
                            value={content}
                            onChangeText={setContent}
                            multiline
                            style={{ height: 100, borderWidth: 1, padding: 10, marginBottom: 12, color: colors.text }}
                            placeholderTextColor="#aaa"
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            {types.map(t => (
                                <TouchableOpacity key={t} onPress={() => setNewType(t)}>
                                    <Text style={{ color: newType === t ? colors.primary : colors.text }}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity onPress={handleSubmit} style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 6 }}>
                            <Text style={{ color: '#fff', textAlign: 'center' }}>등록</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                            setShowModal(false);
                            setSelectedPost(null); // 수정 모드 종료
                        }} style={{ marginTop: 10 }}>
                            <Text style={{ textAlign: 'center', color: colors.subtext }}>취소</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ✅ 수정 모달 */}
            <Modal visible={showEditModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 10 }}>✏️ 게시글 수정</Text>

                        <TextInput
                            placeholder="제목"
                            value={title}
                            onChangeText={setTitle}
                            style={{ borderBottomWidth: 1, marginBottom: 12, fontSize: 16, color: colors.text }}
                            placeholderTextColor="#ccc"
                        />
                        <TextInput
                            placeholder="내용"
                            value={content}
                            onChangeText={setContent}
                            multiline
                            style={{ height: 100, borderWidth: 1, padding: 10, marginBottom: 12, color: colors.text }}
                            placeholderTextColor="#aaa"
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            {types.map(t => (
                                <TouchableOpacity key={t} onPress={() => setNewType(t)}>
                                    <Text style={{ color: newType === t ? colors.primary : colors.text }}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

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

                                    // 상태 초기화
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
                            style={{
                                backgroundColor: colors.primary,
                                padding: 10,
                                borderRadius: 6,
                            }}
                        >
                            <Text style={{ color: '#fff', textAlign: 'center' }}>수정 완료</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => {
                            setShowEditModal(false);
                            setSelectedPost(null);
                        }} style={{ marginTop: 10 }}>
                            <Text style={{ textAlign: 'center', color: colors.subtext }}>취소</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
