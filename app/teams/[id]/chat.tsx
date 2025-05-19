import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    StatusBar,
    Alert,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '@/utils/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDesign } from '@/context/DesignSystem';

type Message = {
    id: string;
    senderName: string;
    senderEmail: string;
    text: string;
    createdAt: any;
};

export default function TeamChat() {
    const { id, name } = useLocalSearchParams();
    const teamId = id as string;
    const teamName = name as string;
    const router = useRouter();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [userEmail, setUserEmail] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();
    const { colors } = useDesign();

    useEffect(() => {
        getCurrentUser().then((user) => {
            if (user?.email) setUserEmail(user.email);
        });
    }, []);

    useEffect(() => {
        if (!teamId) return;

        const q = query(collection(db, 'teams', teamId, 'chats'), orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loaded = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
            }));
            setMessages(loaded);
        });

        return () => unsubscribe();
    }, [teamId]);

    const handleSend = async () => {
        const user = await getCurrentUser();
        if (!input.trim() || !user?.email) return;

        await addDoc(collection(db, 'teams', teamId, 'chats'), {
            senderEmail: user.email,
            senderName: user.name,
            text: input,
            createdAt: serverTimestamp(),
        });

        setInput('');
    };

    useEffect(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const deleteTeamMessage = async (teamId: string, messageId: string) => {
        await deleteDoc(doc(db, 'teams', teamId, 'chats', messageId));
        showToast('✅ 채팅이 삭제되었습니다.');
    };

    const renderItem = ({ item, index }: { item: Message; index: number }) => {
        const isMe = item.senderEmail === userEmail;

        const showDateLabel = (() => {
            if (index === 0) return true;
            const prev = messages[index - 1];
            const currDate = new Date(item.createdAt?.toDate?.() ?? 0).toDateString();
            const prevDate = new Date(prev.createdAt?.toDate?.() ?? 0).toDateString();
            return currDate !== prevDate;
        })();

        const dateLabel = (() => {
            const date = new Date(item.createdAt?.toDate?.() ?? 0);
            const today = new Date();
            return date.toDateString() === today.toDateString() ? '오늘' : date.toLocaleDateString();
        })();

        const timeLabel = (() => {
            const date = new Date(item.createdAt?.toDate?.() ?? 0);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        })();

        return (
            <>
                {showDateLabel && (
                    <View style={{ alignItems: 'center', marginVertical: 10 }}>
                        <Text
                            style={{
                                backgroundColor: colors.card,
                                color: colors.text,
                                paddingVertical: 4,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                                fontSize: 12,
                            }}
                        >
                            {dateLabel}
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    onLongPress={() => {
                        if (isMe) {
                            Alert.alert('메시지 삭제', '삭제하시겠습니까?', [
                                { text: '취소', style: 'cancel' },
                                {
                                    text: '삭제',
                                    style: 'destructive',
                                    onPress: () => deleteTeamMessage(teamId, item.id),
                                },
                            ]);
                        }
                    }}
                    delayLongPress={400}
                    activeOpacity={0.8}
                    style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        marginBottom: 10,
                        maxWidth: '80%',
                        paddingHorizontal: 2,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: isMe ? '#ffeb3b' : '#333',
                            padding: 12,
                            borderRadius: 18,
                            borderTopLeftRadius: isMe ? 18 : 0,
                            borderTopRightRadius: isMe ? 0 : 18,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                    >
                        <Text style={{ color: isMe ? '#000' : '#fff', fontSize: 16 }}>{item.text}</Text>
                        <Text style={{ fontSize: 10, color: '#888', textAlign: 'right', marginTop: 4 }}>
                            {timeLabel}
                        </Text>
                    </View>
                </TouchableOpacity>
            </>
        );
    };

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: colors.background,
                paddingTop: Platform.OS === 'android' ? insets.top : 0,
            }}
        >
            <View
                style={{
                    height: 56,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    backgroundColor: colors.background,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                }}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
                    {teamName}
                </Text>

                {/* 오른쪽 공간 확보용 빈 뷰 */}
                <View style={{ width: 24 }} />
            </View>


            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={{ padding: 12 }}
                            style={{ flex: 1 }}
                            keyboardShouldPersistTaps="handled"
                        />

                        <View style={{
                            flexDirection: 'row',
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            backgroundColor: colors.card,
                            borderTopColor: colors.border,
                            borderTopWidth: 0.5,
                        }}>
                            <TextInput
                                value={input}
                                onChangeText={setInput}
                                placeholder="메시지를 입력하세요"
                                placeholderTextColor={colors.subtext}
                                multiline
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.card,
                                    color: colors.text,
                                    borderRadius: 20,
                                    paddingHorizontal: 14,
                                    paddingTop: 10,
                                    paddingBottom: 10,
                                    fontSize: 16,
                                    textAlignVertical: 'center',
                                }}
                            />
                            <TouchableOpacity onPress={handleSend}>
                                <Text style={{ marginLeft: 10, color: colors.primary, fontWeight: 'bold' }}>전송</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
