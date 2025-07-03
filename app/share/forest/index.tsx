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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/firebase/config';
import { collection, onSnapshot, orderBy, query, addDoc, serverTimestamp } from 'firebase/firestore';
import ForestShhh from './component/ForestShhh';
import { useDesign } from '@/context/DesignSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForestPage() {
    const router = useRouter();
    const { colors, spacing, font, radius } = useDesign();
    const [posts, setPosts] = useState<any[]>([]);
    const [showIntro, setShowIntro] = useState(true);
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [writeModalVisible, setWriteModalVisible] = useState(false);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const q = query(collection(db, 'forest_posts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(data);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        try {
            await addDoc(collection(db, 'forest_posts'), {
                content,
                createdAt: serverTimestamp(),
            });
            setContent('');
            setWriteModalVisible(false);
        } catch (e) {
            console.error('작성 오류', e);
        }
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
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => router.push(`/share/forest/${item.id}`)}
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
                )}
            />

            {/* 글쓰기 모달 */}
            <Modal visible={writeModalVisible} animationType="slide">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} enabled>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 40 : 80, paddingHorizontal: spacing.lg }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                                <Text style={{ fontSize: font.title, fontWeight: 'bold', color: colors.text }}>📝 익명 글 작성</Text>
                                <TouchableOpacity onPress={() => setWriteModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                placeholder="하고 싶은 말을 적어주세요"
                                placeholderTextColor={colors.subtext}
                                value={content}
                                onChangeText={setContent}
                                multiline
                                scrollEnabled={true}
                                textAlignVertical="top"
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.md,
                                    padding: spacing.md,
                                    minHeight: 200,
                                    maxHeight: 400,
                                    color: colors.text,
                                    marginBottom: spacing.md,
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
