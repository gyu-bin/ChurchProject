import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView, Platform,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForestDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, spacing, font } = useDesign();

    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [comment, setComment] = useState('');

    const q = query(collection(db, 'forest_posts', id as string, 'comments'), orderBy('createdAt', 'asc'));

    useEffect(() => {
        if (!id) return;
        const ref = doc(db, 'forest_posts', id as string);
        getDoc(ref).then(snapshot => {
            if (snapshot.exists()) setPost(snapshot.data());
        });
        const fetchData = async () => {
            const snapshot = await getDocs(q);
            // Process snapshot data here
        };

        fetchData();
    }, [id]);

    const handleSubmit = async () => {
        if (!comment.trim()) return;
        await addDoc(collection(db, 'forest_posts', id as string, 'comments'), {
            content: comment,
            createdAt: new Date()
        });
        setComment('');
    };

    const formatDate = (timestamp: any) => {
        const date = new Date(timestamp?.seconds * 1000);
        return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={{ flex: 1, paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }}>
                {/* 상단 헤더 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: font.heading, fontWeight: 'bold', marginLeft: spacing.md, color: colors.text }}>
                        {post ? post.title : "로딩 중..."}
                    </Text>
                </View>

                {/* 본문 */}
                {post && (
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 16, color: colors.text, marginBottom: 4 }}>익명</Text>
                        <Text style={{ fontSize: 13, color: colors.subtext, marginBottom: 8 }}>
                            {formatDate(post.createdAt)}
                        </Text>
                        <Text style={{ fontSize: 24, color: colors.text }}>{post.title}</Text>
                        <Text style={{ fontSize: 16, color: colors.text }}>{post.content}</Text>
                    </View>
                )}

                {/* 댓글 리스트 */}
                <FlatList
                    data={comments}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={{ padding: spacing.md, backgroundColor: colors.surface, borderRadius: 12, marginBottom: spacing.sm }}>
                            <Text style={{ fontWeight: 'bold', marginBottom: 4, color: colors.text }}>익명</Text>
                            <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 6 }}>{formatDate(item.createdAt)}</Text>
                            <Text style={{ color: colors.text }}>{item.content}</Text>
                        </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 80 }}
                />
            </View>

            {/* 댓글 입력창 */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.lg,
                paddingBottom: insets.bottom + spacing.md,
                backgroundColor: colors.background
            }}>
                <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="댓글을 입력하세요"
                    placeholderTextColor={colors.subtext}
                    style={{
                        flex: 1,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                        color: colors.text
                    }}
                />
                <TouchableOpacity onPress={handleSubmit} style={{ marginLeft: spacing.sm }}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>작성</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
