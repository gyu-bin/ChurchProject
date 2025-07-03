import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import {useSafeAreaInsets} from "react-native-safe-area-context";

export default function SermonQuestionDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors, spacing } = useDesign();
    const { user } = useAuth();
    const [question, setQuestion] = useState<any>(null);
    const [replies, setReplies] = useState<any[]>([]);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();
    useEffect(() => {
        const fetchQuestion = async () => {
            const docRef = doc(db, 'sermon_questions', id!);
            const snap = await getDoc(docRef);
            if (snap.exists()) setQuestion({ id: snap.id, ...snap.data() });
            setLoading(false);
        };

        const q = query(
            collection(db, 'sermon_questions', id!, 'replies'),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, snap => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReplies(data);
        });

        fetchQuestion();
        return unsubscribe;
    }, [id]);

    const submitReply = async () => {
        if (!replyText.trim()) return;
        const repliesRef = collection(db, 'sermon_questions', id!, 'replies');
        await addDoc(repliesRef, {
            content: replyText,
            author: user?.name || '익명',
            createdAt: serverTimestamp(),
        });
        setReplyText('');
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: colors.background,
                paddingTop: Platform.OS === 'android' ? insets.top : insets.top
        }}
        >
            {/* 🔝 상단 헤더 */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}
            >
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                    설교 질문
                </Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <View style={{ flex: 1, padding: spacing.md }}>
                    {/* 📝 질문 본문 */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                            {question?.content}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.subtext, marginTop: 4 }}>
                            작성자: {question?.author || '익명'}
                        </Text>
                    </View>

                    {/* 💬 답글 목록 */}
                    <FlatList
                        data={replies}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View
                                style={{
                                    backgroundColor: colors.surface,
                                    borderRadius: 8,
                                    padding: spacing.md,
                                    marginBottom: spacing.sm,
                                }}
                            >
                                <Text style={{ color: colors.text }}>{item.content}</Text>
                                <Text
                                    style={{ color: colors.subtext, fontSize: 12, marginTop: 4 }}
                                >
                                    - {item.author}
                                </Text>
                            </View>
                        )}
                        showsVerticalScrollIndicator={false}
                    />

                    {/* ✍️ 답글 작성 */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: spacing.sm,
                            borderTopWidth: 1,
                            borderColor: colors.border,
                            marginTop: 'auto', // 입력창이 화면 하단으로 밀림
                        }}
                    >
                        <TextInput
                            value={replyText}
                            onChangeText={setReplyText}
                            placeholder="답글 작성..."
                            placeholderTextColor={colors.subtext}
                            style={{
                                flex: 1,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 20,
                                paddingVertical: spacing.sm,
                                paddingHorizontal: spacing.md,
                                color: colors.text,
                                marginRight: spacing.sm,
                            }}
                        />
                        <TouchableOpacity
                            onPress={submitReply}
                            style={{
                                backgroundColor: colors.primary,
                                borderRadius: 20,
                                paddingVertical: spacing.sm,
                                paddingHorizontal: spacing.lg,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>전송</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}
