// ✅ 전체적으로 정리된 FaithChatPage (키보드 올라올 때 FlatList 함께 올라오게 수정)

import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import loading1 from '@/assets/lottie/Animation - 1747201330128.json';
import loading2 from '@/assets/lottie/Animation - 1747201413764.json';
import loading3 from '@/assets/lottie/Animation - 1747201431992.json';
import loading4 from '@/assets/lottie/Animation - 1747201461030.json';

export default function FaithChatPage() {
    const [messages, setMessages] = useState([{ role: 'assistant', content: '안녕하세요! 신앙에 대한 어떤 질문이든 편하게 말씀해주세요 😊' }]);
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const insets = useSafeAreaInsets();
    const { colors, spacing, font } = useDesign();
    const { mode } = useAppTheme();
    const router = useRouter();
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const flatListRef = useRef<FlatList<any>>(null);

    const [showOverlay, setShowOverlay] = useState(false);
    const [currentLottie, setCurrentLottie] = useState<any>(loading1);
    const STORAGE_KEY = 'faithChatMessages';

    const apiKey = Constants?.expoConfig?.extra?.OPENAI_API_KEY ?? Constants?.manifest?.extra?.OPENAI_API_KEY ?? null;

    useEffect(() => {
        loadMessages();
    }, []);

    const dismissKeyboard = () => Keyboard.dismiss();

    const saveMessages = async (msgs:any) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
        } catch (e) {
            console.error('❌ 메시지 저장 실패:', e);
        }
    };

    const loadMessages = async () => {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (json) setMessages(JSON.parse(json));
        } catch (e) {
            console.error('❌ 메시지 불러오기 실패:', e);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 99999, animated: true });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleAsk = async () => {
        if (!question.trim()) return;

        Keyboard.dismiss();
        const animations = [loading1, loading2, loading3, loading4];
        setCurrentLottie(animations[Math.floor(Math.random() * animations.length)]);

        setShowOverlay(true);
        setLoading(true);

        const userMessage = { role: 'user', content: question };
        const updated = [...messages, userMessage];

        setMessages(updated);
        setQuestion('');
        saveMessages(updated);

        try {
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
            const res = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: '당신은 따뜻하고 성경적인 통찰을 주는 신앙 상담가입니다. 시광교회 이정규 목사님처럼 답변해주세요.' },
                        ...updated,
                    ],
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                }
            );

            const assistantReply = { role: 'assistant', content: res.data.choices[0].message.content };
            const newMessages = [...updated, assistantReply];
            setMessages(newMessages);
            saveMessages(newMessages);
        } catch (e) {
            const errorMessage = { role: 'assistant', content: '⚠️ 답변을 가져오지 못했습니다. 다시 시도해주세요.' };
            const errorMessages = [...updated, errorMessage];
            setMessages(errorMessages);
            saveMessages(errorMessages);
        } finally {
            setLoading(false);
            setShowOverlay(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 0.5, borderColor: colors.border, backgroundColor: colors.background }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: font.heading, fontWeight: '600', color: colors.text, marginLeft: 8, flex: 1, textAlign: 'center' }}>
                    💬 AI 신앙상담
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <TouchableWithoutFeedback onPress={dismissKeyboard}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={{ flex: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(_, index) => index.toString()}
                            renderItem={({ item }) => (
                                <View style={{
                                    alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                                    backgroundColor: item.role === 'user' ? '#fcdc3c' : '#2f2f2f',
                                    padding: 10,
                                    borderRadius: 16,
                                    marginBottom: 10,
                                    maxWidth: '80%',
                                    marginHorizontal: 16,
                                }}>
                                    <Text style={{ color: item.role === 'user' ? '#000' : '#fff' }}>{item.content}</Text>
                                </View>
                            )}
                            onScroll={(e) => {
                                const offsetY = e.nativeEvent.contentOffset.y;
                                const contentHeight = e.nativeEvent.contentSize.height;
                                const layoutHeight = e.nativeEvent.layoutMeasurement.height;

                                // 30px 이상 위로 스크롤되면 버튼 표시
                                if (contentHeight - offsetY - layoutHeight > 30) {
                                    setShowScrollToBottom(true);
                                } else {
                                    setShowScrollToBottom(false);
                                }
                            }}
                            contentContainerStyle={{
                                paddingTop: 16,
                                paddingBottom: 10, // 입력창 높이 + 여유
                                flexGrow: 1,        // 💡 이거 없으면 스크롤 안 됨
                            }}
                            keyboardShouldPersistTaps="handled"
                        />

                        <View style={{
                            flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
                            borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.background
                        }}>
                            <TextInput
                                value={question}
                                onChangeText={setQuestion}
                                placeholder="메시지를 입력하세요"
                                placeholderTextColor={colors.subtext}
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.surface,
                                    borderRadius: 20,
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    fontSize: 16,
                                    color: colors.text,
                                }}
                            />
                            <TouchableOpacity onPress={handleAsk} disabled={!question.trim()} style={{ marginLeft: 8 }}>
                                <Ionicons name="send" size={24} color={question.trim() ? colors.primary : colors.border} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>

            {showOverlay && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <LottieView source={currentLottie} autoPlay loop style={{ width: 240, height: 240 }} />
                    <Text style={{ color: '#fff', marginTop: 20, fontSize: 16, fontWeight: '600' }}>
                        답변을 생성 중입니다...
                    </Text>
                </View>
            )}

            {showScrollToBottom && (
                <TouchableOpacity
                    onPress={() => {
                        flatListRef.current?.scrollToOffset({ offset: 99999, animated: true });
                    }}
                    style={{
                        position: 'absolute',
                        bottom: '20%',          // ⬅ 화면 하단 10% 위치
                        left: 0,
                        right: 0,
                        alignItems: 'center',   // ⬅ 가운데 정렬
                        zIndex: 1000,
                    }}
                >
                    <View style={{
                        backgroundColor: '#ccc',   // 회색 배경
                        borderRadius: 24,
                        padding: 12,
                    }}>
                        <Ionicons name="arrow-down" size={20} color="#000" />
                    </View>
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}
