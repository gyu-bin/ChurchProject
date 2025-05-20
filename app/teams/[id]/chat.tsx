import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    SafeAreaView, StyleSheet, Keyboard, KeyboardEvent,
    TouchableWithoutFeedback, Platform, Alert, UIManager, LayoutAnimation, InteractionManager
} from 'react-native';
import { useLocalSearchParams, useRouter,usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Modal from 'react-native-modal';
import {
    collection, addDoc, query, orderBy, onSnapshot,
    serverTimestamp, doc, deleteDoc, getDocs, setDoc, increment, getDoc, where
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { showToast } from '@/utils/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDesign } from '@/context/DesignSystem';
import {sendPushNotification} from "@/services/notificationService";

export default function TeamChat() {
    const { id, name } = useLocalSearchParams();
    const teamId = id as string;
    const teamName = name as string;
    const router = useRouter();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [userEmail, setUserEmail] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const [isActionSheetVisible, setActionSheetVisible] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();
    const { colors } = useDesign();
    const [inputHeight, setInputHeight] = useState(40); // 초기 높이

    const [newMessageBannerVisible, setNewMessageBannerVisible] = useState(false);
    const isScrolledToBottom = useRef(true); // 하단 여부 추적
    const pathname = usePathname();

    useEffect(() => {
        if (Platform.OS === 'android') {
            UIManager.setLayoutAnimationEnabledExperimental?.(true);
        }

        const onKeyboardShow = (e: KeyboardEvent) => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setKeyboardHeight(e.endCoordinates.height);
        };

        const onKeyboardHide = () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setKeyboardHeight(0);

            // ✅ 키보드가 내려가면 자동으로 제일 하단으로 스크롤
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 100000, animated: true });
            }, 100); // 타이밍 조절 가능
        };

        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            onKeyboardShow
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            onKeyboardHide
        );

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        getCurrentUser().then(user => {
            if (user?.email) setUserEmail(user.email);
        });
    }, []);

    useEffect(() => {
        if (keyboardHeight > 0 && inputHeight > 0) {
            const timeout = setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 100000, animated: true });
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [inputHeight]);

    useEffect(() => {
        const q = query(collection(db, 'teams', teamId, 'chats'), orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
            const lastMessage = loaded[loaded.length - 1];

            const isNewMessage = messages.length > 0 &&
                lastMessage?.id !== messages[messages.length - 1]?.id &&
                lastMessage?.senderEmail !== userEmail;

            setMessages(loaded);

            if (isNewMessage) {
                if (isScrolledToBottom.current) {
                    // ✅ 하단일 때만 자동 스크롤
                    setTimeout(() => {
                        flatListRef.current?.scrollToOffset({ offset: 100000, animated: true });
                    }, 100);
                } else {
                    // ✅ 아니면 배너 표시
                    setNewMessageBannerVisible(true);
                }
            }
        });

        return () => unsubscribe();
    }, [teamId, userEmail, messages]); // messages를 deps에 포함시켜야 비교 가능

    /*useEffect(() => {
        if (messages.length === 0) return;

        const timeout = setTimeout(() => {
            // 🔥 하단에 있을 때만 자동 스크롤
            if (isScrolledToBottom.current) {
                flatListRef.current?.scrollToOffset({ offset: 100000, animated: true });
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [messages.length]);*/

    const handleSend = async () => {
        const user = await getCurrentUser();
        if (!input.trim() || !user?.email) return;

        await addDoc(collection(db, 'teams', teamId, 'chats'), {
            senderEmail: user.email,
            senderName: user.name,
            text: input,
            createdAt: serverTimestamp(),
        });

        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);
        if (!teamSnap.exists()) return;

        const teamData = teamSnap.data();
        const membersList: string[] = teamData.membersList || [];
        const notifyEmails = membersList.filter(email => email !== user.email);
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

        if (!visibleInChat && tokens.length > 0) {
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
        InteractionManager.runAfterInteractions(() => {
            if (keyboardHeight === 0) {
                flatListRef.current?.scrollToOffset({ offset: 100000, animated: true });
            }
        });
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
        if (selectedMessage) {
            await Clipboard.setStringAsync(selectedMessage.text);
            showToast('📋 복사되었습니다.');
            setActionSheetVisible(false);
        }
    };

    const handleDelete = async () => {
        if (selectedMessage) {
            Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteDoc(doc(db, 'teams', teamId, 'chats', selectedMessage.id));
                        setActionSheetVisible(false);
                        showToast('✅ 채팅이 삭제되었습니다.');
                    },
                },
            ]);
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const isMe = item.senderEmail === userEmail;
        const showDateLabel =
            index === 0 ||
            new Date(item.createdAt?.toDate?.() ?? 0).toDateString() !==
            new Date(messages[index - 1]?.createdAt?.toDate?.() ?? 0).toDateString();

        const dateLabel = (() => {
            const date = new Date(item.createdAt?.toDate?.() ?? 0);
            const today = new Date();
            return date.toDateString() === today.toDateString() ? '오늘' : date.toLocaleDateString();
        })();

        const timeLabel = new Date(item.createdAt?.toDate?.() ?? 0).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });

        return (
            <>
                {showDateLabel && (
                    <View style={{ alignItems: 'center', marginVertical: 10 }}>
                        <Text
                            style={{
                                backgroundColor: colors.card,
                                color: colors.text,
                                paddingHorizontal: 12,
                                paddingVertical: 4,
                                borderRadius: 12,
                                fontSize: 12,
                            }}
                        >
                            {dateLabel}
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    delayLongPress={400}
                    onLongPress={() => {
                        setSelectedMessage(item);
                        setActionSheetVisible(true);
                    }}
                    style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        marginBottom: 14,
                        maxWidth: '70%',
                        paddingHorizontal: 2,
                    }}
                >
                    <View style={{ marginBottom: 2 }}>
                        {!isMe && (
                            <Text
                                style={{
                                    marginLeft: 6,
                                    marginBottom: 4,
                                    fontSize: 13,
                                    fontWeight: '500',
                                    color: colors.subtext,
                                }}
                            >
                                {item.senderName}
                            </Text>
                        )}

                        <View style={{ flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                            <View
                                style={{
                                    backgroundColor: isMe ? '#3b82f6' : '#333',
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
                            </View>

                            <Text
                                style={{
                                    fontSize: 14,
                                    color: '#888',
                                    marginHorizontal: 6,
                                    marginBottom: 2,
                                }}
                            >
                                {timeLabel}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </>
        );
    };


    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 56,
                    justifyContent: 'center',
                    position: 'relative',
                    paddingHorizontal: 20,
                    marginTop: Platform.OS === 'android' ? insets.top : 0,
                    borderBottomColor: 'black', // 👈 디자인 시스템의 경계선 색상
                    borderBottomWidth: StyleSheet.hairlineWidth, // 👈 얇은 선
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ position: 'absolute', left: 20, zIndex: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 23, fontWeight: '600', color: colors.text }}>
                    {teamName}
                </Text>
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{ flex: 1 }}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{
                            padding: 12,
                            paddingBottom: keyboardHeight + inputHeight + 30, // 입력창 높이 반영
                            flexGrow: 1,
                        }}
                        onContentSizeChange={() => {
                            // ✅ 키보드 열려있지 않고 + 하단일 경우만 자동 스크롤
                            if (keyboardHeight === 0 && isScrolledToBottom.current) {
                                flatListRef.current?.scrollToEnd({ animated: false });
                            }
                        }}
                        onLayout={() => {
                            if (keyboardHeight === 0 && messages.length > 0) {
                                flatListRef.current?.scrollToOffset({
                                    offset: 100000,
                                    animated: false,
                                });
                            }
                        }}
                        onScroll={(e) => {
                            const y = e.nativeEvent.contentOffset.y;
                            const height = e.nativeEvent.contentSize.height;
                            const layoutHeight = e.nativeEvent.layoutMeasurement.height;

                            const isBottom = y + layoutHeight >= height - 10; // 오차 허용 범위 줄이기
                            isScrolledToBottom.current = isBottom;

                            if (isBottom && newMessageBannerVisible) {
                                setNewMessageBannerVisible(false);
                            }
                        }}
                        keyboardShouldPersistTaps="always"
                        initialNumToRender={20}
                        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                    />

                    {/* ✅ 새 메시지 배너 */}
                    {newMessageBannerVisible && (
                        <TouchableOpacity
                            onPress={() => {
                                flatListRef.current?.scrollToOffset({ offset: 100000, animated: true });
                                setNewMessageBannerVisible(false);
                            }}
                            style={{
                                position: 'absolute',
                                bottom: keyboardHeight + inputHeight + 60,
                                alignSelf: 'center',
                                backgroundColor: '#333',
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                zIndex: 10,
                            }}
                        >
                            <Text style={{ color: '#fff' }}>📩 새 메시지 도착</Text>
                        </TouchableOpacity>
                    )}

                    <View
                        style={{
                            position: 'absolute',
                            bottom: Platform.OS === 'ios'
                                ? keyboardHeight - insets.bottom - 15
                                : keyboardHeight,
                            left: 0,
                            right: 0,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            backgroundColor: colors.card,
                            flexDirection: 'row',
                            alignItems: 'flex-end',
                            borderTopColor: colors.border,
                            borderTopWidth: StyleSheet.hairlineWidth,
                            paddingBottom: Platform.OS === 'ios' ? 30 : 15,
                        }}
                    >
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <TextInput
                                value={input}
                                onChangeText={setInput}
                                multiline
                                onFocus={() => {
                                    setTimeout(() => {
                                        flatListRef.current?.scrollToOffset({ offset: 100000, animated: true });
                                    }, 100);
                                }}
                                onContentSizeChange={(e) => {
                                    const newHeight = e.nativeEvent.contentSize.height;
                                    setInputHeight(prev =>
                                        Platform.OS === 'ios'
                                            ? Math.min(Math.max(40, newHeight), 200) // iOS는 120 제한 권장
                                            : Math.max(40, newHeight) // Android는 자연스럽게 제한 없이 늘어나도 괜찮음
                                    );
                                }}
                                placeholder="메시지를 입력하세요"
                                placeholderTextColor={colors.subtext}
                                style={{
                                    // height: inputHeight,
                                    minHeight: 40,
                                    maxHeight: 200,
                                    backgroundColor: colors.card,
                                    color: colors.text,
                                    borderRadius: 20,
                                    paddingHorizontal: 14,
                                    paddingTop: 10,
                                    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
                                    fontSize: 16,
                                    textAlignVertical: 'top',
                                    flexGrow: 1,
                                }}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={input.trim().length === 0}
                            style={{
                                padding: 6,
                                paddingBottom: 10,
                                opacity: input.trim().length === 0 ? 0.4 : 1,
                            }}
                        >
                            <Ionicons
                                name="send"
                                size={24}
                                color={input.trim().length === 0 ? '#999' : colors.primary}
                            />
                        </TouchableOpacity>
                    </View>
                    </View>
            </TouchableWithoutFeedback>

            <Modal
                isVisible={isActionSheetVisible}
                onBackdropPress={() => setActionSheetVisible(false)}
                backdropOpacity={0.4}
                animationIn="fadeIn"
                animationOut="fadeOut"
                animationInTiming={150}
                animationOutTiming={150}
                useNativeDriver
                hideModalContentWhileAnimating={true} // 깜빡임 방지 핵심 옵션
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: 0,
                }}
            >
                <View
                    style={{
                        width: 280,
                        backgroundColor: '#1e1e1e',
                        borderRadius: 16,
                        paddingVertical: 12,
                        paddingHorizontal: 0,
                    }}
                >
                    <TouchableOpacity onPress={handleCopy} style={styles.optionCentered}>
                        <Text style={styles.optionText}>복사</Text>
                    </TouchableOpacity>

                    {selectedMessage?.senderEmail === userEmail && (
                        <>
                            <View style={styles.divider} />
                            <TouchableOpacity onPress={handleDelete} style={styles.optionCentered}>
                                <Text style={[styles.optionText, { color: '#ff5e5e' }]}>삭제</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <View style={styles.divider} />
                    <TouchableOpacity onPress={() => setActionSheetVisible(false)} style={styles.optionCentered}>
                        <Text style={[styles.optionText, { color: '#888' }]}>취소</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    optionCentered: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    optionText: {
        fontSize: 16,
        color: '#fff',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#444',
        marginHorizontal: 16,
    },
});
