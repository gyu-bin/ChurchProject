import { useDesign } from '@/app/context/DesignSystem';
import { db } from '@/firebase/config';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';

export default function NoticeTab() {
    const { colors, spacing } = useDesign();
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState({ id: '', title: '', content: '' });
    const [noticeList, setNoticeList] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotices = async () => {
        const q = query(collection(db, 'notice'), where('type', '==', 'notice'));
        const snap = await getDocs(q);
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setNoticeList(list);
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchNotices();
        setRefreshing(false);
    };

    const handleSave = async () => {
        if (!form.title || !form.content) {
            Alert.alert('모든 필드를 입력해주세요');
            return;
        }

        const payload = {
            title: form.title,
            content: form.content,
            type: 'notice',
        };

        if (form.id) {
            await updateDoc(doc(db, 'notice', form.id), payload);
        } else {
            await addDoc(collection(db, 'notice'), payload);
        }

        setForm({ id: '', title: '', content: '' });
        setModalVisible(false);
        fetchNotices(); // 저장 후 목록 업데이트
    };

    const renderItem = ({ item }: any) => (
        <View style={{ marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontWeight: 'bold' }}>{item.title}</Text>
            <Text style={{ color: colors.subtext }}>{item.content}</Text>

            <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity
                    onPress={() => {
                        setForm({ id: item.id, title: item.title, content: item.content });
                        setModalVisible(true);
                    }}
                    style={{ flex: 1, backgroundColor: colors.primary, padding: spacing.sm, marginRight: spacing.sm, borderRadius: 8 }}
                >
                    <Text style={{ textAlign: 'center', color: '#fff' }}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
                            { text: '취소', style: 'cancel' },
                            {
                                text: '삭제',
                                style: 'destructive',
                                onPress: async () => {
                                    await deleteDoc(doc(db, 'notice', item.id));
                                    fetchNotices();
                                },
                            },
                        ]);
                    }}
                    style={{ flex: 1, backgroundColor: colors.error, padding: spacing.sm, borderRadius: 8 }}
                >
                    <Text style={{ textAlign: 'center', color: '#fff' }}>삭제</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <>
            <FlatList
                data={noticeList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: spacing.md }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={renderItem}
            />

            <TouchableOpacity
                onPress={() => {
                    setForm({ id: '', title: '', content: '' });
                    setModalVisible(true);
                }}
                style={{
                    margin: spacing.md,
                    backgroundColor: colors.primary,
                    padding: spacing.md,
                    borderRadius: 8,
                }}
            >
                <Text style={{ color: '#fff', textAlign: 'center' }}>공지 추가</Text>
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="fade">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#00000066',
                    }}
                >
                    <View
                        style={{
                            width: '90%',
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            borderRadius: 12,
                        }}
                    >
                        <TextInput
                            placeholder="제목"
                            placeholderTextColor={colors.subtext} // ✅ 다크모드 대응
                            value={form.title}
                            onChangeText={(t) => setForm((prev) => ({ ...prev, title: t }))}
                            style={{
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 8,
                                marginBottom: spacing.sm,
                                padding: spacing.sm,
                                color: colors.text,
                            }}
                        />
                        <TextInput
                            placeholder="내용"
                            placeholderTextColor={colors.subtext} // ✅ 다크모드 대응
                            value={form.content}
                            onChangeText={(t) => setForm((prev) => ({ ...prev, content: t }))}
                            multiline
                            style={{
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 8,
                                marginBottom: spacing.sm,
                                padding: spacing.sm,
                                height: 100,
                                color: colors.text,
                            }}
                        />
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={{
                                    flex: 1,
                                    padding: spacing.sm,
                                    backgroundColor: colors.border,
                                    marginRight: spacing.sm,
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ textAlign: 'center', color: colors.text }}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                style={{
                                    flex: 1,
                                    padding: spacing.sm,
                                    backgroundColor: colors.primary,
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ textAlign: 'center', color: '#fff' }}>저장</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}
