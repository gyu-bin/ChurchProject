import { useDesign } from '@/app/context/DesignSystem';
import { useAppTheme } from '@/app/context/ThemeContext';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { sendPushNotification } from "@/services/notificationService";
import { showToast } from '@/utils/toast';
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
    ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    currentDate: Date;
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

type TeamMember = {
    email: string;
    name: string;
};

export default function TeamChat() {
    const { id, name } = useLocalSearchParams()
    const colorScheme = useColorScheme(); // 현재 다크모드 여부
    const isDarkMode = colorScheme === 'dark';
    const teamId = id as string;
    const teamName = name as string;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [isActionSheetVisible, setActionSheetVisible] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null); // 🔥 답글 대상
    const flatListRef = useRef<FlatList>(null);
    const [justDeleted, setJustDeleted] = useState(false);
    const { colors, spacing, radius, font } = useDesign();
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
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [showMentionModal, setShowMentionModal] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
    const [cursorPosition, setCursorPosition] = useState(0);
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const [user, setUser] = useState<any>(null);
    const [notificationEnabled, setNotificationEnabled] = useState(true);
    const [loading, setLoading] = useState(true);

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
        const q = query(chatRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    senderEmail: data.senderEmail,
                    senderName: data.senderName,
                    text: data.text,
                    createdAt: data.createdAt ? data.createdAt : new Date(),
                    replyTo: data.replyTo || null,
                };
            });
            setMessages(docs.reverse());

            const lastMessage = docs[0];  // docs are now in descending order

            // 하단에 있을 경우 → 자동 스크롤
            if (isAtBottom) {
                setTimeout(() => {
                    flatListRef.current?.scrollToOffset({ offset: 1000000, animated: true });
                }, 100);
            }

            // 배너 띄우기 로직
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
            setTimeout(() => setHighlightedMessageId(null), 500);
        });
    }, []);

    const scrollToMessage = useCallback((index: number) => {
        try {
            flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.3
            });

            const messageId = messages[index]?.id;
            if (messageId) {
                highlightMessage(messageId);
            }
        } catch (error) {
            console.error('Scroll to message failed:', error);
        }
    }, [messages, highlightMessage]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || !userEmail || isComposing) return;

        const now = new Date();
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

            // Create optimistic update with local timestamp
            const newTempMessage = {
                ...messageData,
                id: `temp-${Date.now()}`,
                createdAt: now,
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

        // 날짜 처리
        const getDate = (timestamp: Message['createdAt']) => {
            if (!timestamp) return new Date();

            if (timestamp instanceof Date) {
                return timestamp;
            }

            return new Date(timestamp.seconds * 1000);
        };

        const currentMessageDate = getDate(item.createdAt);
        const previousMessageDate = index > 0 ? getDate(messages[index - 1].createdAt) : null;

        const showDate = !previousMessageDate ||
            currentMessageDate.toDateString() !== previousMessageDate.toDateString();

        const isHighlighted = item.id === highlightedMessageId;
        const messageStyle = isHighlighted ? {
            transform: [{ scale: scaleAnim }]
        } : undefined;

        return (
            <Animated.View style={messageStyle}>
                <MessageItemComponent
                    item={item}
                    isMyMessage={isMyMessage}
                    showDate={showDate}
                    currentDate={currentMessageDate}
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
            scrollToMessage(results[0].index);
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
        scrollToMessage(searchResults[newIndex].index);
    }, [searchResults, currentSearchIndex]);

    useEffect(() => {
        const fetchTeamMembers = async () => {
            try {
                const teamDoc = await getDoc(doc(db, 'teams', teamId));
                if (!teamDoc.exists()) return;

                const memberEmails = teamDoc.data().membersList || [];
                const memberPromises = memberEmails.map(async (email: string) => {
                    const userQuery = query(collection(db, 'users'), where('email', '==', email));
                    const userSnap = await getDocs(userQuery);
                    const userData = userSnap.docs[0]?.data();
                    return {
                        email,
                        name: userData?.name || email
                    };
                });

                const members = await Promise.all(memberPromises);
                setTeamMembers(members);
            } catch (error) {
                console.error('Error fetching team members:', error);
            }
        };

        fetchTeamMembers();
    }, [teamId]);

    // 멘션 모달 필터링
    useEffect(() => {
        if (mentionQuery) {
            const filtered = teamMembers
                .filter(member =>
                    member.email !== userEmail && // 본인 제외
                    (member.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
                        member.email.toLowerCase().includes(mentionQuery.toLowerCase()))
                );
            setFilteredMembers(filtered);
        } else {
            setFilteredMembers(teamMembers.filter(member => member.email !== userEmail)); // 본인 제외
        }
    }, [mentionQuery, teamMembers, userEmail]);

    const handleTextChange = (text: string) => {
        setInput(text);

        // '@' 입력 감지 및 모달 표시
        if (text.slice(-1) === '@') {
            setShowMentionModal(true);
            setMentionQuery('');
        } else if (showMentionModal) {
            // '@' 이후의 텍스트로 멘션 검색
            const lastAtIndex = text.lastIndexOf('@');
            if (lastAtIndex >= 0) {
                setMentionQuery(text.slice(lastAtIndex + 1));
            } else {
                setShowMentionModal(false);
            }
        }
    };

    const handleMentionSelect = (member: TeamMember) => {
        const lastAtIndex = input.lastIndexOf('@');
        const newText = input.slice(0, lastAtIndex) + `@${member.name} `; // 이메일 대신 이름만 사용
        setInput(newText);
        setShowMentionModal(false);
        inputRef.current?.focus();
    };

    // 멘션된 사용자 이름을 하이라이트하는 함수 추가
    const highlightMentions = (text: string) => {
        const mentionRegex = /@([^\s]+)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            // 멘션 앞의 일반 텍스트
            if (match.index > lastIndex) {
                parts.push(
                    <Text key={`text-${lastIndex}`} style={{ color: colors.text }}>
                        {text.slice(lastIndex, match.index)}
                    </Text>
                );
            }

            // 멘션된 부분
            parts.push(
                <Text
                    key={`mention-${match.index}`}
                    style={{ color: colors.primary, fontWeight: '600' }}
                >
                    {match[0]}
                </Text>
            );

            lastIndex = match.index + match[0].length;
        }

        // 마지막 일반 텍스트
        if (lastIndex < text.length) {
            parts.push(
                <Text key={`text-${lastIndex}`} style={{ color: colors.text }}>
                    {text.slice(lastIndex)}
                </Text>
            );
        }

        return parts.length > 0 ? parts : text;
    };

    useEffect(() => {
        const setup = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);

            // 채팅방 입장 시 뱃지 카운트 초기화
            if (currentUser?.email) {
                try {
                    const badgeRef = doc(db, 'teams', teamId, 'chatBadge', currentUser.email);
                    await setDoc(badgeRef, { count: 0 }, { merge: true });
                } catch (error) {
                    console.error('뱃지 초기화 실패:', error);
                }
            }

            // 알림 설정 상태 가져오기
            if (currentUser?.email) {
                try {
                    const notifRef = doc(db, `teams/${id}/notificationSettings/${currentUser.email}`);
                    const notifDoc = await getDoc(notifRef);
                    if (notifDoc.exists()) {
                        setNotificationEnabled(notifDoc.data().enabled);
                    }
                } catch (error) {
                    console.error('알림 설정 로드 실패:', error);
                }
            }
            setLoading(false);
        };
        setup();
    }, [id, teamId]);

    const toggleNotification = async () => {
        if (!user?.email) return;

        try {
            const newState = !notificationEnabled;
            const notifRef = doc(db, `teams/${id}/notificationSettings/${user.email}`);
            await setDoc(notifRef, {
                enabled: newState,
                updatedAt: new Date(),
            });
            setNotificationEnabled(newState);
            showToast(`알림을 ${newState ? '켰' : '껐'}습니다`);
        } catch (error) {
            console.error('알림 설정 변경 실패:', error);
            showToast('알림 설정 변경에 실패했습니다');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.background,
            }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[
            styles.safeArea,
            {
                backgroundColor: colors.background,
                paddingTop: Platform.OS === 'android' ? insets.top  : 0,
            }
        ]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {teamName}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        onPress={toggleNotification}
                        style={styles.notificationButton}
                    >
                        <Ionicons
                            name={notificationEnabled ? "notifications" : "notifications-off"}
                            size={24}
                            color={notificationEnabled ? colors.primary : colors.subtext}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={() => {
                            setIsSearchVisible(true);
                            setSearchQuery('');
                            setSearchResults([]);
                            setCurrentSearchIndex(-1);
                        }}
                    >
                        <Ionicons name="search" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {isSearchVisible && (
                <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
                    <View style={[styles.searchInputContainer, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                        <Ionicons name="search" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                handleSearch(text);
                            }}
                            placeholder="메시지 검색..."
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholderTextColor={colors.subtext}
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
                                Keyboard.dismiss();
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
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                contentContainerStyle={styles.keyboardAvoidingContent}
            >
                <View style={styles.chatContainer}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={[styles.flatListContent, {
                            padding: 12,
                            paddingBottom: 20,
                            flexGrow: 1,
                            justifyContent: 'flex-end'
                        }]}
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
                            onChangeText={handleTextChange}
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

            {/* 멘션 모달 */}
            <Modal
                visible={showMentionModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMentionModal(false)}
            >
                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                    }}
                    activeOpacity={1}
                    onPress={() => setShowMentionModal(false)}
                >
                    <View style={{
                        position: 'absolute',
                        bottom: 80,
                        left: spacing.sm,
                        right: spacing.sm,
                        backgroundColor: colors.surface,
                        borderRadius: radius.md,
                        maxHeight: 200,
                        padding: spacing.sm,
                    }}>
                        <FlatList
                            data={filteredMembers}
                            keyExtractor={(item) => item.email}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleMentionSelect(item)}
                                    style={{
                                        padding: spacing.sm,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border,
                                    }}
                                >
                                    <Text style={{
                                        color: colors.text,
                                        fontSize: font.body,
                                        fontWeight: '500'
                                    }}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

// 멘션 하이라이트 컴포넌트
const MentionTextComponent = memo(({ text, colors, isMyMessage }: { text: string; colors: any; isMyMessage: boolean }) => {
    const mentionRegex = /@([^\s]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        // 멘션 앞의 일반 텍스트
        if (match.index > lastIndex) {
            parts.push(
                <Text key={`text-${lastIndex}`} style={{ color: isMyMessage ? '#000' : '#fff' }}>
                    {text.slice(lastIndex, match.index)}
                </Text>
            );
        }

        // 멘션된 부분
        parts.push(
            <Text
                key={`mention-${match.index}`}
                style={{ color: colors.primary, fontWeight: '600' }}
            >
                {match[0]}
            </Text>
        );

        lastIndex = match.index + match[0].length;
    }

    // 마지막 일반 텍스트
    if (lastIndex < text.length) {
        parts.push(
            <Text key={`text-${lastIndex}`} style={{ color: isMyMessage ? '#000' : '#fff' }}>
                {text.slice(lastIndex)}
            </Text>
        );
    }

    return parts.length > 0 ? <Text style={{ fontSize: 16 }}>{parts}</Text> : <Text style={{ fontSize: 16, color: isMyMessage ? '#000' : '#fff' }}>{text}</Text>;
});

MentionTextComponent.displayName = 'MentionTextComponent';

const MessageItemComponent = memo(({
    item,
    isMyMessage,
    showDate,
    currentDate,
    onLongPress,
    onReplyPress,
    colors,
    searchQuery
}: MessageItemProps & { currentDate: Date }) => {
    return (
        <View>
            {showDate && (
                <View style={{ alignItems: 'center', marginVertical: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.subtext }}>
                        {currentDate.toDateString() === new Date().toDateString()
                            ? '오늘'
                            : currentDate.toLocaleDateString()}
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
                    <MentionTextComponent text={item.text} colors={colors} isMyMessage={isMyMessage} />
                </View>
                <Text style={styles.time}>
                    {currentDate.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </Text>
            </TouchableOpacity>
        </View>
    );
});

MessageItemComponent.displayName = 'MessageItemComponent';

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
        justifyContent: 'flex-end'
    },
    flatListContent: {
        flexGrow: 1,
        justifyContent: 'flex-end'
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#ccc',
        paddingHorizontal: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: -1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
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
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
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
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: 40,
        justifyContent: 'flex-end',
    },
    notificationButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
