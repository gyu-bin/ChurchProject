import React, {useEffect, useRef, useState} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView, Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import LottieView from 'lottie-react-native';

import loading1 from '@/assets/lottie/Animation - 1747201330128.json'
import loading2 from '@/assets/lottie/Animation - 1747201413764.json'
import loading3 from '@/assets/lottie/Animation - 1747201431992.json'
import loading4 from '@/assets/lottie/Animation - 1747201461030.json'

export default function FaithChatPage() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([{
        role: 'assistant',
        content: '안녕하세요! 신앙에 대한 어떤 질문이든 편하게 말씀해주세요 😊',
    }]);
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const insets = useSafeAreaInsets();
    const { colors, spacing, font, radius } = useDesign();
    const { mode } = useAppTheme();
    const router = useRouter();

    const [showOverlay, setShowOverlay] = useState(false);
    const [currentLottie, setCurrentLottie] = useState<any>(loading1); // 초기값 아무거나

    const STORAGE_KEY = 'faithChatMessages';
    const apiKey = Constants.expoConfig?.extra?.OPENAI_API_KEY;
    const scrollRef = useRef<ScrollView>(null);
    // 메시지 업데이트 시 자동 스크롤
    useEffect(() => {
        const timeout = setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 150); // ✅ 렌더링 딜레이 고려해서 100~200ms가 안정적
        return () => clearTimeout(timeout);
    }, [messages]);

// 화면 아무데나 터치하면 키보드 내리기
    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    const saveMessages = async (msgs: { role: 'user' | 'assistant'; content: string }[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
        } catch (e) {
            console.error('❌ 메시지 저장 실패:', e);
        }
    };

    const loadMessages = async () => {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (json) {
                setMessages(JSON.parse(json));
            } else {
                setMessages([
                    {
                        role: 'assistant',
                        content: '안녕하세요! 신앙에 대한 어떤 질문이든 편하게 말씀해주세요 😊',
                    },
                ]);
            }
        } catch (e) {
            console.error('❌ 메시지 불러오기 실패:', e);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 100); // 100ms 정도가 가장 안정적
    };

    useEffect(() => {
        loadMessages();
    }, []);

    const handleAsk = async () => {
        if (!question.trim()) return;

        Keyboard.dismiss();  // ✅ 전송 직후 키보드 내림

        const animations = [loading1, loading2, loading3, loading4];
        const randomIndex = Math.floor(Math.random() * animations.length);
        setCurrentLottie(animations[randomIndex]);

        setShowOverlay(true);
        setLoading(true);

        const userMessage = { role: 'user' as const, content: question };
        const updated = [...messages, userMessage];

        setMessages(updated);
        setQuestion('');
        saveMessages(updated);
        scrollToBottom();

        try {
            // ✅ 3~5초 로딩 효과
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.floor(Math.random() * 2000)));

            const res = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: '당신은 따뜻하고 성경적인 통찰을 주는 신앙 상담가입니다. 시광교회 이정규 목사님처럼 답변해주세요.',
                        },
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

            const assistantReply = {
                role: 'assistant' as const,
                content: res.data.choices[0].message.content,
            };

            const newMessages = [...updated, assistantReply];
            setMessages(newMessages);
            saveMessages(newMessages);
            scrollToBottom();
        } catch (e) {
            const errorMessage = {
                role: 'assistant' as const,
                content: '⚠️ 답변을 가져오지 못했습니다. 다시 시도해주세요.',
            };
            const errorMessages = [...updated, errorMessage];
            setMessages(errorMessages);
            saveMessages(errorMessages);
            scrollToBottom();
        } finally {
            setLoading(false);
            setShowOverlay(false); // ✅ 반드시 필요
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 0.5, borderColor: colors.border, backgroundColor: colors.background }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text, marginLeft: 8 }}>AI 신앙상담</Text>
            </View>

            <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={{ flex: 1 }}>
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={{ flexGrow: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.map((msg, index) => (
                            <View
                                key={index}
                                style={{
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    backgroundColor: msg.role === 'user' ? '#fcdc3c' : '#2f2f2f',
                                    padding: spacing.sm,
                                    borderRadius: 18,
                                    borderTopRightRadius: msg.role === 'user' ? 0 : 18,
                                    borderTopLeftRadius: msg.role === 'user' ? 18 : 0,
                                    marginBottom: 10,
                                    maxWidth: '80%',
                                }}
                            >
                                <Text style={{ color: msg.role === 'user' ? '#000' : '#fff', fontSize: font.body }}>{msg.content}</Text>
                            </View>
                        ))}
                        {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.sm }} />}
                    </ScrollView>


                    <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, backgroundColor: colors.background }}>
                        <TextInput
                            value={question}
                            onChangeText={setQuestion}
                            placeholder="메시지 입력"
                            placeholderTextColor={colors.subtext}
                            style={{
                                flex: 1,
                                backgroundColor: colors.surface,
                                borderRadius: 20,
                                paddingHorizontal: spacing.md,
                                paddingVertical: Platform.OS === 'ios' ? spacing.sm : 8,
                                fontSize: font.body,
                                color: colors.text,
                                height: 40,
                            }}
                        />
                        <TouchableOpacity
                            onPress={handleAsk}
                            disabled={loading || !question.trim()}
                            style={{ marginLeft: spacing.sm }}
                        >
                            <Ionicons name="send" size={24} color={question.trim() ? colors.primary : colors.border} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
            </TouchableWithoutFeedback>

            {showOverlay && (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', // ✅ 더 어둡게
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                }}>
                    <LottieView
                        source={currentLottie}
                        autoPlay
                        loop
                        style={{ width: 240, height: 240 }} // ✅ 더 크게
                    />
                    <Text style={{
                        color: '#fff',
                        marginTop: 20,
                        fontSize: 16,
                        fontWeight: '600',
                    }}>
                        답변을 생성 중입니다...
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}
