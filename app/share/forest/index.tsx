import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Modal,
    StyleSheet,
    Platform,
    TextInput,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/firebase/config';
import {
    collection, onSnapshot, orderBy, query, addDoc, serverTimestamp, doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import ForestShhh from './component/ForestShhh';
import { useDesign } from '@/context/DesignSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentUser } from '@/services/authService';

export default function ForestPage() {
    const router = useRouter();
    const { colors, spacing, font, radius } = useDesign();
    const [posts, setPosts] = useState<any[]>([]);
    const [showIntro, setShowIntro] = useState(true);
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [writeModalVisible, setWriteModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editPostId, setEditPostId] = useState('');
    const [user, setUser] = useState<any>(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        getCurrentUser().then(setUser);
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'forest_posts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(data);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async () => {
        if (!content.trim() || !title.trim()) return;
        try {
            await addDoc(collection(db, 'forest_posts'), {
                title,
                content,
                authorEmail: user?.email,
                createdAt: serverTimestamp(),
            });
            setTitle('');
            setContent('');
            setWriteModalVisible(false);
        } catch (e) {
            console.error('작성 오류', e);
        }
    };

    const handleUpdate = async () => {
        if (!editTitle.trim() || !editContent.trim()) return;
        try {
            await updateDoc(doc(db, 'forest_posts', editPostId), {
                title: editTitle,
                content: editContent,
            });
            setEditModalVisible(false);
        } catch (e) {
            console.error('수정 오류', e);
        }
    };

    const handleDelete = async (postId: string) => {
        Alert.alert('삭제 확인', '정말 이 글을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'forest_posts', postId));
                    } catch (e) {
                        console.error('삭제 오류', e);
                    }
                },
            },
        ]);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top : insets.top }}>
            {/* 🔥 상단 헤더 */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>🌲 대나무숲</Text>
                <TouchableOpacity onPress={() => setWriteModalVisible(true)}>
                    <Ionicons name="create-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* 글 리스트 */}
            <FlatList
                data={posts}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: spacing.lg }}
                renderItem={({ item }) => {
                    const isMyPost = item.authorEmail === user?.email;
                    return (
                        <View
                            style={{
                                backgroundColor: colors.surface,
                                marginVertical: 6,
                                padding: spacing.md,
                                borderRadius: radius.md,
                                shadowColor: '#000',
                                shadowOpacity: 0.08,
                                shadowOffset: { width: 0, height: 2 },
                                shadowRadius: 6,
                                elevation: 2,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => router.push(`/share/forest/${item.id}`)}
                            >
                                <Text numberOfLines={1} style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>
                                    {item.title}
                                </Text>
                                <Text numberOfLines={2} style={{ fontSize: font.body, color: colors.subtext, marginTop: 4 }}>
                                    {item.content}
                                </Text>
                                <Text style={{ fontSize: font.caption, color: colors.subtext, marginTop: 6 }}>
                                    {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleString() : '작성 중...'}
                                </Text>
                            </TouchableOpacity>

                            {/* 수정/삭제 버튼 */}
                            {isMyPost && (
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setEditTitle(item.title);
                                            setEditContent(item.content);
                                            setEditPostId(item.id);
                                            setEditModalVisible(true);
                                        }}
                                        style={{ marginRight: spacing.sm }}
                                    >
                                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>수정</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                        <Text style={{ color: 'red', fontWeight: 'bold' }}>삭제</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                }}
            />

            {/* 작성 모달 */}
            <Modal visible={writeModalVisible} animationType="slide">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 80, paddingHorizontal: spacing.lg }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                                <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>📝 글 작성</Text>
                                <TouchableOpacity onPress={() => setWriteModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                placeholder="제목"
                                placeholderTextColor={colors.subtext}
                                value={title}
                                onChangeText={setTitle}
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.md,
                                    padding: spacing.md,
                                    color: colors.text,
                                    marginBottom: spacing.md,
                                }}
                            />
                            <TextInput
                                placeholder="내용"
                                placeholderTextColor={colors.subtext}
                                value={content}
                                onChangeText={setContent}
                                multiline
                                textAlignVertical="top"
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.md,
                                    padding: spacing.md,
                                    minHeight: 200,
                                    color: colors.text,
                                }}
                            />
                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={{
                                    backgroundColor: colors.primary,
                                    padding: spacing.md,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                    marginTop: spacing.lg,
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>작성 완료</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            {/* 수정 모달 */}
            <Modal visible={editModalVisible} animationType="slide">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 80, paddingHorizontal: spacing.lg }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                                <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>✏️ 글 수정</Text>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                placeholder="제목"
                                placeholderTextColor={colors.subtext}
                                value={editTitle}
                                onChangeText={setEditTitle}
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.md,
                                    padding: spacing.md,
                                    color: colors.text,
                                    marginBottom: spacing.md,
                                }}
                            />
                            <TextInput
                                placeholder="내용"
                                placeholderTextColor={colors.subtext}
                                value={editContent}
                                onChangeText={setEditContent}
                                multiline
                                textAlignVertical="top"
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.md,
                                    padding: spacing.md,
                                    minHeight: 200,
                                    color: colors.text,
                                }}
                            />
                            <TouchableOpacity
                                onPress={handleUpdate}
                                style={{
                                    backgroundColor: colors.primary,
                                    padding: spacing.md,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                    marginTop: spacing.lg,
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>수정 완료</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            <ForestShhh visible={showIntro} onClose={() => setShowIntro(false)} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});
