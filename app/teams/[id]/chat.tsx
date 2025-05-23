import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { sendPushNotification } from "@/services/notificationService";
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where
} from 'firebase/firestore';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    AppState,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    LayoutAnimation,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useColorScheme,
    View
} from 'react-native';

// Constants
const BATCH_SIZE = 10;
const INITIAL_RENDER_COUNT = 20;
const MAX_BATCH_RENDER = 30;
const WINDOW_SIZE = 15;
const SCROLL_THRESHOLD = 40;
const MIN_INPUT_HEIGHT = 40;
const MAX_INPUT_HEIGHT = 100;

// Types
interface Message {
    id: string;
    senderEmail: string;
    senderName: string;
    text: string;
    createdAt: any;
    replyTo?: {
        messageId: string;
        senderName: string;
        text: string;
    } | null;
}

interface LatestMessageInfo {
    id: string;
    name: string;
    text: string;
}

interface MembersList {
    email: string;
}

interface TeamData {
    membersList: string[];
    name: string;
}

interface MessageItemProps {
    item: Message;
    isMyMessage: boolean;
    showDate: boolean;
    currentDate: string;
    onLongPress: () => void;
    onReplyPress: () => void;
    colors: {
        background: string;
        surface: string;
        text: string;
        subtext: string;
        primary: string;
        border: string;
    };
    searchQuery: string;
}

export default function TeamChat() {
    const { id, name } = useLocalSearchParams()
    const colorScheme = useColorScheme(); // 현재 다크모드 여부
    const isDarkMode = colorScheme === 'dark';
    const teamId = id as string;
    const teamName = name as string;
    const router = useRouter();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [isActionSheetVisible, setActionSheetVisible] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null); // 🔥 답글 대상
    const flatListRef = useRef<FlatList>(null);
    const [justDeleted, setJustDeleted] = useState(false);
    const { colors } = useDesign();
    const pathname = usePathname();
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showNewMessageBanner, setShowNewMessageBanner] = useState(false);
    const [latestMsgInfo, setLatestMsgInfo] = useState<LatestMessageInfo | null>(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const didInitialScroll = useRef(false);
    const [hasSeenNewMessage, setHasSeenNewMessage] = useState(false);
    const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);
    const seenMessages = useRef<Set<string>>(new Set());
    const hasInitialized = useRef(false); // 🔥 최초 진입 이후에만 알림 허용
    const isAtBottomRef = useRef(true); // ✅ 변경됨
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const isMe = useCallback((email: string) => email === userEmail, [userEmail]);
    const inputRef = useRef<TextInput>(null);
    const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
    const [isComposing, setIsComposing] = useState(false);
    const [tempMessage, setTempMessage] = useState<Message | null>(null);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ index: number; id: string }[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        getCurrentUser().then(user => {
            if (user?.email) setUserEmail(user.email);
            if (user?.name) setUserName(user.name);
        });
    }, []);

    useEffect(() => {
        if (messages.length === 0 || didInitialScroll.current) return;

        const timeout = setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
            didInitialScroll.current = true;
            hasInitialized.current = true;
        }, 300);

        return () => clearTimeout(timeout);
    }, [messages]);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    useEffect(() => {
        let appStateListener: any;

        const updateStatus = async (screen: string, teamId: string | null) => {
            const user = await getCurrentUser();
            if (!user?.email) return;

            await setDoc(doc(db, 'userStatus', user.email), {
                currentScreen: screen,
                teamId: teamId ?? '',
                updatedAt: serverTimestamp(),
            }, { merge: true });
        };

        // ✅ 채팅방 진입 시 상태 등록
        updateStatus('chat', teamId);

        // ✅ 앱 상태 변화 감지
        appStateListener = AppState.addEventListener('change', async (nextState) => {
            if (nextState === 'active') {
                // 포그라운드 복귀 → 채팅방으로 다시 등록
                await updateStatus('chat', teamId);
            } else if (nextState === 'inactive' || nextState === 'background') {
                // 앱 나감 → 상태 초기화
                await updateStatus('', null);
            }
        });

        return () => {
            appStateListener.remove();

            // ✅ 언마운트 시에도 상태 초기화
            updateStatus('', null);
        };
    }, [teamId]);

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
            setMessages(docs); // ✅ 상태 업데이트

            const lastMessage = docs[docs.length - 1];

            // ✅ 하단에 있을 경우 → 자동 스크롤
            if (isAtBottom) {
                setTimeout(() => {
                    flatListRef.current?.scrollToOffset({ offset: 1000000, animated: true });
                }, 100);
            }

            // ✅ 배너 띄우기 로직
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
            }
        });

        return () => unsubscribe();
    }, [teamId, isAtBottom, userEmail, lastSeenMessageId]);

    const scrollToMessage = useCallback((messageId: string) => {
        const index = messages.findIndex(msg => msg.id === messageId);
        if (index === -1) return;

        try {
            flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5
            });
        } catch (error) {
            console.warn('ScrollToIndex failed, falling back to offset', error);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0.5
                });
            }, 300);
        }
    }, [messages]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || !userEmail || isComposing) return;

        const messageData = {
            senderEmail: userEmail,
            senderName: userName,
            text: input.trim(),
            createdAt: serverTimestamp(),
            replyTo: replyTo ? {
                messageId: replyTo.id,
                senderName: replyTo.senderName,
                text: replyTo.text,
            } : null,
        };

        try {
            setInput('');
            setReplyTo(null);
            setSelectedMessage(null);
            
            // Create optimistic update
            const newTempMessage = {
                ...messageData,
                id: `temp-${Date.now()}`,
                createdAt: new Date(),
            };
            setTempMessage(newTempMessage);
            setMessages(prev => [...prev, newTempMessage]);

            // Actual send
            const docRef = await addDoc(collection(db, 'teams', teamId, 'chats'), messageData);
            await handleNotifications();

            // Update with real ID
            setMessages(prev => prev.map(msg => 
                msg.id === newTempMessage.id ? { ...msg, id: docRef.id } : msg
            ));
            setTempMessage(null);
        } catch (error) {
            console.error('Failed to send message:', error);
            // Revert optimistic update
            if (tempMessage) {
                setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
                setTempMessage(null);
            }
            Alert.alert('메시지 전송 실패', '다시 시도해주세요.');
        }
    }, [input, userEmail, userName, teamId, replyTo, isComposing, tempMessage]);

    const handleNotifications = useCallback(async () => {
        const teamSnap = await getDoc(doc(db, 'teams', teamId));
        if (!teamSnap.exists()) return;

        const teamData = teamSnap.data() as TeamData;
        const membersList = teamData.membersList || [];
        const excludeEmails = await getActiveUsers();
        const notifyEmails = membersList.filter(email => 
            email !== userEmail && !excludeEmails.includes(email)
        );

        if (notifyEmails.length === 0) return;

        const tokens = await getNotificationTokens(notifyEmails);
        if (tokens.length > 0) {
            await sendNotifications(tokens, teamData.name);
        }

        await updateBadgeCounts(notifyEmails);
    }, [teamId, userEmail, userName]);

    const getActiveUsers = useCallback(async () => {
        const snapshot = await getDocs(collection(db, 'userStatus'));
        return snapshot.docs
            .filter(doc => doc.data().currentScreen === 'chat' && doc.data().teamId === teamId)
            .map(doc => doc.id);
    }, [teamId]);

    const getNotificationTokens = useCallback(async (emails: string[]) => {
        const tokens: string[] = [];
        const batches = [];
        
        for (let i = 0; i < emails.length; i += BATCH_SIZE) {
            batches.push(emails.slice(i, i + BATCH_SIZE));
        }

        await Promise.all(batches.map(async (batch) => {
            const q = query(collection(db, 'expoTokens'), where('email', 'in', batch));
            const snap = await getDocs(q);
            snap.forEach(doc => {
                const token = doc.data().token;
                if (token) tokens.push(token);
            });
        }));

        return tokens;
    }, []);

    const sendNotifications = useCallback(async (tokens: string[], teamName: string) => {
        await sendPushNotification({
            to: tokens,
            title: teamName,
            body: `${userName}: ${input.trim()}`,
            data: { screen: 'chat', teamId },
        });
    }, [userName, input, teamId]);

    const updateBadgeCounts = useCallback(async (emails: string[]) => {
        await Promise.all(emails.map(email => 
            setDoc(
                doc(db, 'teams', teamId, 'chatBadge', email),
                { count: increment(1) },
                { merge: true }
            )
        ));
    }, [teamId]);

    const handleScrollToBottom = useCallback(() => {
        flatListRef.current?.scrollToOffset({ offset: 99999, animated: true });

        if (latestMsgInfo) {
            setLastSeenMessageId(latestMsgInfo.id);
            seenMessages.current.add(latestMsgInfo.id);
        }

        setShowNewMessageBanner(false);
        setLatestMsgInfo(null);
    }, [latestMsgInfo]);

    // Fix type for membersList filter with proper typing
    const notifyUsers = useCallback((teamData: TeamData, excludeEmails: string[]) => {
        if (!teamData?.membersList) return [];
        return teamData.membersList.filter((memberEmail: string) => 
            memberEmail !== userEmail && !excludeEmails.includes(memberEmail)
        );
    }, [userEmail]);

    const highlightMessage = useCallback((messageId: string) => {
        setHighlightedMessageId(messageId);
        scaleAnim.setValue(1);
        
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 2.05,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start(() => {
            // Clear the highlight after animation
            setTimeout(() => setHighlightedMessageId(null), 500);
        });
    }, []);

    const safeScrollToMessage = useCallback((messageId: string) => {
        const index = messages.findIndex(msg => msg.id === messageId);
        if (index === -1) return;

        flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.3
        });

        highlightMessage(messageId);
    }, [messages, highlightMessage]);

    // Safe message operations
    const handleMessageAction = useCallback((message: Message | null, action: 'copy' | 'edit' | 'reply') => {
        if (!message) return;

        switch (action) {
            case 'copy':
                Clipboard.setStringAsync(message.text);
                break;
            case 'edit':
                setInput(message.text);
                setReplyTo(null);
                break;
            case 'reply':
                setReplyTo(message);
                break;
        }
        setActionSheetVisible(false);
    }, []);

    // Input height adjustment with animation
    const handleContentSizeChange = useCallback((event: { nativeEvent: { contentSize: { height: number } } }) => {
        const height = Math.min(Math.max(event.nativeEvent.contentSize.height, MIN_INPUT_HEIGHT), MAX_INPUT_HEIGHT);
        LayoutAnimation.configureNext({
            duration: 150,
            create: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
            },
            update: {
                type: LayoutAnimation.Types.easeInEaseOut,
            },
            delete: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
            },
        });
        setInputHeight(height);
    }, []);

    // Handle keyboard show/hide with animation
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                setIsKeyboardVisible(true);
                if (isAtBottomRef.current) {
                    const keyboardHeight = event.endCoordinates?.height || 0;
                    LayoutAnimation.configureNext({
                        duration: 250,
                        create: {
                            type: LayoutAnimation.Types.easeInEaseOut,
                            property: LayoutAnimation.Properties.opacity,
                        },
                        update: {
                            type: LayoutAnimation.Types.easeInEaseOut,
                        },
                        delete: {
                            type: LayoutAnimation.Types.easeInEaseOut,
                            property: LayoutAnimation.Properties.opacity,
                        },
                    });
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 50);
                }
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setIsKeyboardVisible(false);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
        const isMyMessage = isMe(item.senderEmail);
        const currentDate = new Date(item.createdAt?.toDate()).toDateString();
        const previousDate = index > 0 ? new Date(messages[index - 1]?.createdAt?.toDate()).toDateString() : null;
        const showDate = currentDate !== previousDate;
        const isHighlighted = item.id === highlightedMessageId;

        const messageStyle = isHighlighted ? {
            transform: [{ scale: scaleAnim }]
        } : undefined;

        return (
            <Animated.View style={messageStyle}>
                <MessageItem
                    item={item}
                    isMyMessage={isMyMessage}
                    showDate={showDate}
                    currentDate={currentDate}
                    onLongPress={() => {
                        setSelectedMessage(item);
                        setActionSheetVisible(true);
                    }}
                    onReplyPress={() => {
                        if (item.replyTo?.messageId) {
                            safeScrollToMessage(item.replyTo.messageId);
                        }
                    }}
                    colors={colors}
                    searchQuery={searchQuery}
                />
            </Animated.View>
        );
    }, [messages, isMe, colors, safeScrollToMessage, highlightedMessageId, scaleAnim, searchQuery]);

    const handleSearch = useCallback((query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setCurrentSearchIndex(-1);
            return;
        }

        const results = messages.reduce((acc: { index: number; id: string }[], message, index) => {
            if (message.text.toLowerCase().includes(query.toLowerCase())) {
                acc.push({ index, id: message.id });
            }
            return acc;
        }, []);

        setSearchResults(results);
        if (results.length > 0) {
            setCurrentSearchIndex(0);
            const firstResult = results[0];
            flatListRef.current?.scrollToIndex({
                index: firstResult.index,
                animated: true,
                viewPosition: 0.3
            });
        }
    }, [messages]);

    const navigateSearchResult = useCallback((direction: 'next' | 'prev') => {
        if (searchResults.length === 0) return;

        let newIndex;
        if (direction === 'next') {
            newIndex = (currentSearchIndex + 1) % searchResults.length;
        } else {
            newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
        }

        setCurrentSearchIndex(newIndex);
        const targetResult = searchResults[newIndex];
        flatListRef.current?.scrollToIndex({
            index: targetResult.index,
            animated: true,
            viewPosition: 0.3
        });
    }, [searchResults, currentSearchIndex]);

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {teamName}
                    </Text>
                </View>
                <TouchableOpacity 
                    style={styles.searchButton} 
                    onPress={() => setIsSearchVisible(true)}
                >
                    <Ionicons name="search" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            {isSearchVisible && (
                <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
                    <View style={[styles.searchInputContainer, { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }]}>
                        <TextInput
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                handleSearch(text);
                            }}
                            placeholder="메시지 검색..."
                            style={[styles.searchInput, { 
                                color: isDarkMode ? '#fff' : '#000',
                                backgroundColor: 'transparent'
                            }]}
                            placeholderTextColor={isDarkMode ? '#999' : '#666'}
                            autoFocus
                        />
                        {searchResults.length > 0 && (
                            <View style={styles.searchNavigation}>
                                <Text style={[styles.searchCount, { color: colors.text }]}>
                                    {currentSearchIndex + 1}/{searchResults.length}
                                </Text>
                                <TouchableOpacity 
                                    onPress={() => navigateSearchResult('prev')}
                                    style={styles.searchNavButton}
                                >
                                    <Ionicons name="chevron-up" size={20} color={colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => navigateSearchResult('next')}
                                    style={styles.searchNavButton}
                                >
                                    <Ionicons name="chevron-down" size={20} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity 
                            onPress={() => {
                                setIsSearchVisible(false);
                                setSearchQuery('');
                                setSearchResults([]);
                                setCurrentSearchIndex(-1);
                            }}
                            style={styles.searchCloseButton}
                        >
                            <Ionicons name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <KeyboardAvoidingView 
                style={styles.container} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                contentContainerStyle={styles.keyboardAvoidingContent}
            >
                <View style={styles.chatContainer}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.flatListContent}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                        removeClippedSubviews={false}
                        initialNumToRender={INITIAL_RENDER_COUNT}
                        maxToRenderPerBatch={MAX_BATCH_RENDER}
                        windowSize={WINDOW_SIZE}
                        maintainVisibleContentPosition={{
                            minIndexForVisible: 0,
                            autoscrollToTopThreshold: 10,
                        }}
                        onEndReachedThreshold={0.1}
                        onEndReached={() => {
                            // Load more messages if needed
                        }}
                        onLayout={() => {
                            if (!didInitialScroll.current && messages.length > 0) {
                                setTimeout(() => {
                                    flatListRef.current?.scrollToEnd({ animated: false });
                                    didInitialScroll.current = true;
                                }, 100);
                            }
                        }}
                        onScroll={(event) => {
                            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                            const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - SCROLL_THRESHOLD;

                            isAtBottomRef.current = isBottom;
                            setShowScrollToBottom(!isBottom);

                            if (isBottom) {
                                setShowNewMessageBanner(false);
                                if (messages.length > 0) {
                                    const lastMsgId = messages[messages.length - 1].id;
                                    setLastSeenMessageId(lastMsgId);
                                    seenMessages.current.add(lastMsgId);
                                }
                            }
                        }}
                        onContentSizeChange={(width, height) => {
                            if (isAtBottomRef.current) {
                                flatListRef.current?.scrollToEnd({ animated: !isKeyboardVisible });
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
                </View>

                <View style={styles.inputContainer}>
                    {replyTo && (
                        <View style={styles.replyPreview}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.replyPreviewName}>
                                    {replyTo.senderName}에게 답장
                                </Text>
                                <Text
                                    numberOfLines={2}
                                    ellipsizeMode="tail"
                                    style={styles.replyPreviewText}
                                >
                                    {replyTo.text}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyCloseButton}>
                                <Ionicons name="close" size={18} color="#444" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={[styles.inputBar, { backgroundColor: colors.surface }]}>
                        <TextInput
                            ref={inputRef}
                            value={input}
                            onChangeText={setInput}
                            placeholder="메시지를 입력하세요"
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                    height: inputHeight,
                                }
                            ]}
                            placeholderTextColor={colors.subtext}
                            multiline
                            onContentSizeChange={handleContentSizeChange}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!input.trim()}
                            style={[
                                styles.sendButton,
                                { opacity: input.trim() ? 1 : 0.4 }
                            ]}
                        >
                            <Ionicons 
                                name="send" 
                                size={24} 
                                color={input.trim() ? colors.primary : '#999'} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>
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
                                onPress={() => handleMessageAction(selectedMessage, 'reply')}
                            >
                                <Text style={styles.modalText}>답글 달기</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.modalButton} 
                                onPress={() => handleMessageAction(selectedMessage, 'copy')}
                            >
                                <Text style={styles.modalText}>복사</Text>
                            </TouchableOpacity>
                            {selectedMessage?.senderEmail === userEmail && (
                                <>
                                    <TouchableOpacity 
                                        style={styles.modalButton}
                                        onPress={() => handleMessageAction(selectedMessage, 'edit')}
                                    >
                                        <Text style={styles.modalText}>수정</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.modalButton} 
                                        onPress={async () => {
                                            if (!selectedMessage) return;
                                            setJustDeleted(true);
                                            await deleteDoc(doc(db, 'teams', teamId, 'chats', selectedMessage.id));
                                            setActionSheetVisible(false);
                                        }}
                                    >
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

const MessageItem = memo(({ 
    item, 
    isMyMessage, 
    showDate, 
    currentDate,
    onLongPress,
    onReplyPress,
    colors,
    searchQuery
}: MessageItemProps) => {
    return (
        <View>
            {showDate && (
                <View style={{ alignItems: 'center', marginVertical: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.subtext }}>
                        {currentDate === new Date().toDateString() ? '오늘' : currentDate}
                    </Text>
                </View>
            )}

            {!isMyMessage && (
                <Text style={{ fontSize: 12, color: '#666', marginLeft: 8, marginBottom: 2 }}>
                    {item.senderName}
                </Text>
            )}

            <TouchableOpacity
                onLongPress={onLongPress}
                style={{
                    alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                    marginVertical: 4,
                    marginBottom: 10,
                    maxWidth: '75%',
                    position: 'relative',
                }}
            >
                <View style={[styles.bubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
                    {item.replyTo && (
                        <TouchableOpacity
                            onPress={onReplyPress}
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
                                    color: isMyMessage ? '#1565c0' : '#90caf9',
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
                                    color: isMyMessage ? '#333' : '#e0e0e0',
                                }}
                            >
                                {item.replyTo.text}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <Text style={{ fontSize: 16, color: isMyMessage ? '#000' : '#fff' }}>
                        {item.text}
                    </Text>
                </View>
                <Text style={styles.time}>
                    {item.createdAt?.toDate() ? new Date(item.createdAt.toDate()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    }) : ''}
                </Text>
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    keyboardAvoidingContent: {
        flex: 1,
    },
    chatContainer: {
        flex: 1,
    },
    flatListContent: {
        padding: 12,
        paddingBottom: 20,
        flexGrow: 1,
    },
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
    inputContainer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: '#ccc',
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 8,
        paddingHorizontal: 12,
        minHeight: MIN_INPUT_HEIGHT,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    sendButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    replyPreview: {
        backgroundColor: '#eee',
        padding: 8,
        borderRadius: 8,
        margin: 8,
        marginBottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    replyPreviewName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 2,
    },
    replyPreviewText: {
        fontSize: 13,
        color: '#666',
    },
    replyCloseButton: {
        marginLeft: 8,
        padding: 4,
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
        bottom: 30, 
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
        bottom: 50,
        borderRadius: 20,
        padding: 10,
        alignSelf: 'center',
    },
    searchButton: {
        position: 'absolute',
        right: 16,
        zIndex: 10,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
        paddingVertical: 8,
    },
    searchNavigation: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    searchCount: {
        fontSize: 12,
        marginRight: 8,
    },
    searchNavButton: {
        padding: 4,
        marginHorizontal: 2,
    },
    searchCloseButton: {
        padding: 8,
        marginLeft: 4,
    },
});





