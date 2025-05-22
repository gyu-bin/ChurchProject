import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    SafeAreaView, StyleSheet, Keyboard, KeyboardAvoidingView,
    Platform, Alert, TouchableWithoutFeedback, Modal, Pressable, useColorScheme
} from 'react-native';
import {useRouter, useLocalSearchParams, usePathname, useFocusEffect} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    collection, addDoc, query, orderBy, onSnapshot,
    serverTimestamp, doc, deleteDoc, getDoc, where, getDocs, setDoc, increment
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { useDesign } from '@/context/DesignSystem';
import * as Clipboard from 'expo-clipboard';
import {sendPushNotification} from "@/services/notificationService";

export default function TeamChat() {
    const { id, name } = useLocalSearchParams()
    const colorScheme = useColorScheme(); // 현재 다크모드 여부
    const isDarkMode = colorScheme === 'dark';
    const teamId = id as string;
    const teamName = name as string;
    const router = useRouter();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const [isActionSheetVisible, setActionSheetVisible] = useState(false);
    const [replyTo, setReplyTo] = useState<any | null>(null); // 🔥 답글 대상
    const flatListRef = useRef<FlatList>(null);
    const [justDeleted, setJustDeleted] = useState(false);
    const { colors } = useDesign();
    const pathname = usePathname();
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showNewMessageBanner, setShowNewMessageBanner] = useState(false);
    const [latestMsgInfo, setLatestMsgInfo] = useState<{ id: string, name: string, text: string } | null>(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const didInitialScroll = useRef(false);
    const [hasSeenNewMessage, setHasSeenNewMessage] = useState(false);
    const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);
    const seenMessages = useRef<Set<string>>(new Set());
    const hasInitialized = useRef(false); // 🔥 최초 진입 이후에만 알림 허용
    useEffect(() => {
        getCurrentUser().then(user => {
            if (user?.email) setUserEmail(user.email);
            if (user?.name) setUserName(user.name);
        });
    }, []);

    // ✅ useEffect로 messages가 바뀔 때 아래로 강제 스크롤
    useEffect(() => {
        if (messages.length === 0 || didInitialScroll.current) return;

        const timeout = setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 1000000, animated: true });
            didInitialScroll.current = true;

            setTimeout(() => {
                setIsAtBottom(true);
                hasInitialized.current = true; // 🔥 이 시점부터 알림 작동
            }, 300);
        }, 300);

        return () => clearTimeout(timeout);
    }, [messages]);

    useEffect(() => {
        const setUserStatus = async () => {
            const user = await getCurrentUser();
            if (!user?.email) return;

            await setDoc(doc(db, 'userStatus', user.email), {
                currentScreen: 'chat',
                teamId: teamId,
                updatedAt: serverTimestamp(),
            }, { merge: true });
        };

        setUserStatus();

        return () => {
            // 채팅방 나갈 때 초기화
            const clearUserStatus = async () => {
                const user = await getCurrentUser();
                if (!user?.email) return;

                await setDoc(doc(db, 'userStatus', user.email), {
                    currentScreen: '',
                    teamId: '',
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            };

            clearUserStatus();
        };
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            let isMounted = true;
            const updatePresence = async () => {
                const user = await getCurrentUser();
                if (!user?.email) return;

                const ref = doc(db, 'teams', teamId, 'onlineUsers', user.email);
                await setDoc(ref, { email: user.email, updatedAt: serverTimestamp() });

                return async () => {
                    if (isMounted) {
                        await deleteDoc(ref);
                        isMounted = false;
                    }
                };
            };

            const unsubscribe = updatePresence();
            return () => {
                if (unsubscribe) unsubscribe;
            };
        }, [teamId])
    );
    useEffect(() => {
        setHasSeenNewMessage(false);
    }, [teamId]);

    // ⬇ 기존 useEffect에서 메시지 도착 감지하는 부분 수정
    useEffect(() => {
        const chatRef = collection(db, 'teams', teamId, 'chats');
        const q = query(chatRef, orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => {
                const data = doc.data() as any;
                const replyToData = data.replyTo ?? null;

                return {
                    id: doc.id,
                    ...data,
                    replyTo: replyToData,
                };
            });
            setMessages(docs); // ✅ 먼저 상태 업데이트

            const lastMessage = docs[docs.length - 1];

            if (
                lastMessage &&
                lastMessage.senderEmail !== userEmail &&
                !seenMessages.current.has(lastMessage.id) &&
                !isAtBottom &&
                hasInitialized.current
            ) {
                setLatestMsgInfo({
                    id: lastMessage.id,
                    name: lastMessage.senderName,
                    text: lastMessage.text,
                });
                setShowNewMessageBanner(true);
            }});

        return () => unsubscribe();
    }, [teamId, isAtBottom, userEmail, lastSeenMessageId]);

    const scrollToMessage = (messageId: string) => {
        const index = messages.findIndex(msg => msg.id === messageId);

        if (index !== -1 && flatListRef.current) {
            try {
                flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 }); // 중간으로
            } catch (error) {
                console.warn('scrollToIndex 실패, fallback 실행', error);
                flatListRef.current.scrollToOffset({ offset: 0, animated: false });
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                }, 300);
            }
        } else {
            console.warn('해당 메시지를 찾을 수 없습니다.');
        }
    };

    const handleSend = async () => {
        const user = await getCurrentUser();
        if (!input.trim() || !user?.email) return;

        const replyData = replyTo
            ? {
                messageId: replyTo.messageId,
                senderName: replyTo.senderName,
                text: replyTo.text,
            }
            : null;
        console.log('replyData',replyData);

        const docData = {
            senderEmail: user.email,
            senderName: user.name,
            text: input.trim(), // ✅ 정확히 'text'
            createdAt: serverTimestamp(),
            replyTo: replyData,
        };

        console.log("🔥 Firestore에 저장할 데이터:", JSON.stringify(docData, null, 2));

        await addDoc(collection(db, 'teams', teamId, 'chats'), {
            senderEmail: user.email,
            senderName: user.name,
            text: input.trim(),
            createdAt: serverTimestamp(),
            replyTo: replyData, // ✅ 여기서 replyTo 상태 기준
        });

        console.log('replyTo',replyTo);

        setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 1000000, animated: true });
        }, 100);

        /*const onlineSnap = await getDocs(collection(db, 'teams', teamId, 'onlineUsers'));
        const onlineEmails = onlineSnap.docs.map(doc => doc.id);*/

        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);
        if (!teamSnap.exists()) return;

        const teamData = teamSnap.data();
        const membersList: string[] = teamData.membersList || [];

        const userStatusSnap = await getDocs(collection(db, 'userStatus'));
        const excludeEmails: string[] = [];
        userStatusSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.currentScreen === 'chat' && data.teamId === teamId) {
                excludeEmails.push(docSnap.id); // 이메일이 문서 ID
            }
        });
        const notifyEmails = membersList.filter(
            email => email !== user.email && !excludeEmails.includes(email)
        );
        const tokens: string[] = [];

        if (notifyEmails.length > 0) {
            const batches: string[][] = [];
            const copy = [...notifyEmails];
            while (copy.length) {
                batches.push(copy.splice(0, 10));
            }

            for (const batch of batches) {
                const q = query(collection(db, 'expoTokens'), where('email', 'in', batch));
                const snap = await getDocs(q);
                snap.forEach(doc => {
                    const token = doc.data().token;
                    if (token) tokens.push(token);
                });
            }
        }

        const visibleInChat = pathname === `/teams/${teamId}/chat`;

        // console.log("📤 알림 보낼 대상 토큰 목록:", tokens);

        if (tokens.length > 0) {
            await sendPushNotification({
                to: tokens,
                title: teamData.name,
                body: `${user.name}: ${input.trim()}`,
                data: {
                    screen: 'chat',
                    teamId,
                },
            });
        }

        if (!visibleInChat) {
            for (const email of notifyEmails) {
                const badgeRef = doc(db, 'teams', teamId, 'chatBadge', email);
                await setDoc(badgeRef, { count: increment(1) }, { merge: true });
            }
        }

        setInput('');
        setReplyTo(null);
        setSelectedMessage(null);
    };


    useEffect(() => {
        const clearChatBadge = async () => {
            const user = await getCurrentUser();
            if (!user?.email) return;
            await setDoc(doc(db, 'teams', teamId, 'chatBadge', user.email), {
                count: 0,
            }, { merge: true });
        };

        clearChatBadge();
    }, []);

    const handleCopy = async () => {
        if (!selectedMessage) return;
        await Clipboard.setStringAsync(selectedMessage.text);
        setActionSheetVisible(false);
    };

    const handleDelete = async () => {
        if (!selectedMessage) return;
        setJustDeleted(true); // 삭제 플래그
        await deleteDoc(doc(db, 'teams', teamId, 'chats', selectedMessage.id));
        setActionSheetVisible(false);
    };

    const handleEdit = async () => {
        if (!selectedMessage) return;
        setInput(selectedMessage.text);
        await deleteDoc(doc(db, 'teams', teamId, 'chats', selectedMessage.id));
        setActionSheetVisible(false);
    };

    const scrollToReplyTarget = (messageId: string) => {
        const index = messages.findIndex(msg => msg.id === messageId);
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: true });
        }
    };

    // ⬇ 메시지 배너 눌렀을 때 배너 다시 안 뜨도록 보장
    const handleScrollToBottom = () => {
        flatListRef.current?.scrollToOffset({ offset: 99999, animated: true });

        if (latestMsgInfo) {
            setLastSeenMessageId(latestMsgInfo.id);
            seenMessages.current.add(latestMsgInfo.id); // ✅ 이걸 빼먹으면 다시 뜸
        }

        setShowNewMessageBanner(false);
        setLatestMsgInfo(null);
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const isMe = item.senderEmail === userEmail;
        const currentDate = new Date(item.createdAt?.toDate?.()).toDateString();
        const previousDate = index > 0 ? new Date(messages[index - 1]?.createdAt?.toDate?.()).toDateString() : null;
        const showDate = currentDate !== previousDate;

        return (
            <View>
                {showDate && (
                    <View style={{ alignItems: 'center', marginVertical: 8 }}>
                        <Text style={{ fontSize: 12, color: colors.subtext }}>
                            {currentDate === new Date().toDateString() ? '오늘' : currentDate}
                        </Text>
                    </View>
                )}

                {/* 이름 (본인 메시지는 생략 가능) */}
                {!isMe && (
                    <Text style={{ fontSize: 12, color: '#666', marginLeft: 8, marginBottom: 2 }}>
                        {item.senderName}
                    </Text>
                )}

                <TouchableOpacity
                    onLongPress={() => {
                        setSelectedMessage(item);
                        setActionSheetVisible(true);
                    }}
                    style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        marginVertical: 4,
                        marginBottom: 10,
                        maxWidth: '75%',
                        position: 'relative',
                    }}
                >
                    <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                        {item.replyTo && (
                            <TouchableOpacity
                                onPress={() => scrollToMessage(item.replyTo.messageId)}
                                activeOpacity={0.8}
                                style={{
                                    padding: 8,
                                    borderRadius: 8,
                                    marginBottom: 6,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: isMe ? '#1565c0' : '#90caf9',
                                        marginBottom: 4,
                                    }}
                                >
                                    {item.replyTo.senderName}에게 답장
                                </Text>
                                <Text
                                    numberOfLines={2}
                                    ellipsizeMode="tail"
                                    style={{
                                        fontSize: 14,
                                        color: isMe ? '#333' : '#e0e0e0',
                                    }}
                                >
                                    {item.replyTo.text}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <Text style={{ fontSize: 16, color: isMe ? '#000' : '#fff' }}>{item.text}</Text>
                    </View>
                    <Text style={styles.time}>
                        {new Date(item.createdAt?.toDate?.()).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                    {/*<View style={[styles.tail, isMe ? styles.myTail : styles.otherTail]} />*/}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 20 : 0}}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {teamName}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={{ padding: 12 }}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="interactive"
                            removeClippedSubviews={true}
                            initialNumToRender={20}
                            maxToRenderPerBatch={30}
                            windowSize={15}
                            onLayout={() => {
                                setTimeout(() => {
                                    flatListRef.current?.scrollToOffset({ offset: 99999, animated: false });
                                }, 100);
                            }}
                            onScroll={(event) => {
                                const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                                const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
                                setIsAtBottom(isBottom);
                                setShowScrollToBottom(!isBottom);
                                if (isBottom) {
                                    setShowNewMessageBanner(false);

                                    if (messages.length > 0) {
                                        const lastMsgId = messages[messages.length - 1].id;
                                        setLastSeenMessageId(lastMsgId);
                                        seenMessages.current.add(lastMsgId); // ✅ 여기 중요
                                    }
                                }
                            }}
                        />

                        {showScrollToBottom && (
                            <TouchableOpacity
                                onPress={() => {
                                    flatListRef.current?.scrollToOffset({ offset: 100000, animated: true });
                                    setShowScrollToBottom(false); // 👈 스크롤 후 버튼 숨김
                                }}
                                style={styles.scrollToBottomButton}
                            >
                                <Ionicons name="arrow-down-circle" size={36} color="#555" />
                            </TouchableOpacity>
                        )}

                        {showNewMessageBanner && latestMsgInfo && (
                            <TouchableOpacity
                                onPress={handleScrollToBottom}
                                style={styles.newMessageBanner}
                            >
                                <Text style={styles.newMessageText} numberOfLines={1} ellipsizeMode="tail">
                                    {latestMsgInfo.name}: {latestMsgInfo.text}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {replyTo && (
                            <View
                                style={{
                                    backgroundColor: '#eee',
                                    padding: 8,
                                    borderRadius: 8,
                                    margin: 8,
                                    marginBottom: 0,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 'bold',
                                            color: '#444',
                                            marginBottom: 2,
                                        }}
                                    >
                                        {replyTo.senderName}에게 답장
                                    </Text>
                                    <Text
                                        numberOfLines={2}
                                        ellipsizeMode="tail"
                                        style={{
                                            fontSize: 13,
                                            color: '#666',
                                        }}
                                    >
                                        {replyTo.text}
                                    </Text>
                                </View>

                                <TouchableOpacity onPress={() => setReplyTo(null)} style={{ marginLeft: 8 }}>
                                    <Ionicons name="close" size={18} color="#444" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={[
                            styles.inputBar,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            }
                        ]}>
                            <TextInput
                                value={input}
                                onChangeText={setInput}
                                placeholder="메시지를 입력하세요"
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: colors.background,
                                        color: colors.text,
                                    }
                                ]}
                                placeholderTextColor={colors.subtext}
                                multiline
                            />
                            <TouchableOpacity
                                onPress={handleSend}
                                disabled={input.trim().length === 0}
                                style={{
                                    padding: 6,
                                    paddingBottom: 10,
                                    opacity: input.trim().length === 0 ? 0.4 : 1,
                                }}
                            >
                                <Ionicons name="send" size={24} color={input.trim() ? colors.primary : '#999'} />
                            </TouchableOpacity>
                        </View>

                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            <Modal
                visible={isActionSheetVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setActionSheetVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setActionSheetVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalBox}>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => {
                                    setReplyTo({
                                        messageId: selectedMessage.id,
                                        text: selectedMessage.text,
                                        senderName: selectedMessage.senderName,
                                    });
                                    console.log(selectedMessage);
                                    setActionSheetVisible(false);
                                }}
                            >
                                <Text style={styles.modalText}>답글 달기</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalButton} onPress={handleCopy}>
                                <Text style={styles.modalText}>복사</Text>
                            </TouchableOpacity>
                            {selectedMessage?.senderEmail === userEmail && (
                                <>
                                    <TouchableOpacity style={styles.modalButton} onPress={handleEdit}>
                                        <Text style={styles.modalText}>수정</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modalButton} onPress={handleDelete}>
                                        <Text style={[styles.modalText, { color: 'red' }]}>삭제</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#ccc',
        paddingHorizontal: 20,
        position: 'relative',
    },
    backButton: {
        zIndex: 10,
    },
    headerTitleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 25,
        fontWeight: 'bold',
    },
    bubble: {
        padding: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginTop: 4,
    },
    myBubble: {
        backgroundColor: '#dcf8c6',
        borderBottomRightRadius: 0,
    },
    otherBubble: {
        backgroundColor: '#333',
        borderBottomLeftRadius: 0,
    },
    tail: {
        position: 'absolute',
        bottom: 0,
        width: 0,
        height: 0,
        borderTopWidth: 10,
        borderTopColor: 'transparent',
    },
    myTail: {
        right: -6,
        borderLeftWidth: 10,
        borderLeftColor: '#dcf8c6',
    },
    otherTail: {
        left: -6,
        borderRightWidth: 10,
        borderRightColor: '#333',
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: '#ccc',
        backgroundColor: '#f8f8f8'
    },
    input: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        maxHeight: 120
    },
    time: {
        fontSize: 10,
        color: '#999',
        marginTop: 4,
        textAlign: 'right'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: 220,
        paddingVertical: 12,
    },
    modalButton: {
        paddingVertical: 14,
        alignItems: 'center'
    },
    modalText: {
        fontSize: 16,
        color: '#222'
    },
    newMessageBanner: {
        position: 'absolute',
        bottom: 70, // ← scrollToBottomButton 위로 이동
        alignSelf: 'center',
        backgroundColor: '#444',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        zIndex: 10,
        maxWidth: '90%',
    },
    newMessageText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500'
    },
    scrollToBottomButton: {
        position: 'absolute',
        bottom: 100,
        borderRadius: 20,
        padding: 10,
        alignSelf: 'center',
    },
});




