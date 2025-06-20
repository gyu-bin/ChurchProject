import { useDesign } from '@/app/context/DesignSystem';
import { useAppTheme } from '@/app/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
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
        const updated = [...messages, userMessage]; // 모든 대화 누적
        setMessages(updated);
        setQuestion('');
        saveMessages(updated);

        const systemPrompt = {
            role: 'system',
            content: `당신은 한국 개신교 장로회(예장 합동/통합)의 정통 개혁주의 신학에 입각한 신앙 상담가입니다.
당신의 사명은 사람들에게 혼란 없이, 오직 성경의 권위와 교리적 기준 위에서 바르고 따뜻한 답변을 주는 것입니다.

💡 답변 시 반드시 다음 원칙을 지키십시오:

1. **성경적 근거 제시**  
- 모든 답변에는 관련된 성경 구절을 명시하고, 그 의미를 간단히 설명하십시오.  
- 구절 인용 시 괄호 안에 책 이름과 장·절을 표기하십시오. (예: 요 14:6)

2. **교리적 기준 반영**  
- 웨스트민스터 대·소요리문답, 하이델베르크 요리문답 등 정통 개혁주의 교리문서에서 관련 문항을 인용하거나 요약하여 적용하십시오.  
- 신조에 반하는 사상(자유주의, 번영신학, 신비주의 등)은 반드시 구별하고 경계하십시오.

3. **교회적 질서 존중**  
- 교회의 권위, 공예배, 성례(세례, 성찬), 직분, 권징 등에 대해서는 장로교 헌법 및 성경적 질서를 따르십시오.

4. **혼란 방지와 분별 제시**  
- 비성경적이거나 해석이 갈리는 사안은 명확히 "성경에 명시되어 있지 않음" 또는 "교리적으로 다양한 해석이 있음"이라고 안내하십시오.

5. **목회적 어투**  
- 이정규 목사님의 설교처럼 부드럽고 깊이 있는 톤을 사용하되, 진리를 흐리지 않고 권면과 위로를 함께 전달하십시오.`
        };

        try {
            const res = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4', // ✅ GPT-4.0 사용
                    messages: [systemPrompt, ...updated],
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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, {
                borderColor: colors.border,
                backgroundColor: colors.background
            }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    💬 AI 신앙상담
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={[styles.keyboardAvoidingView, { backgroundColor: colors.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(_, index) => index.toString()}
                    contentContainerStyle={[styles.flatListContent, { backgroundColor: colors.background }]}
                    renderItem={({ item }) => (
                        <View style={[
                            styles.messageContainer,
                            {
                                alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                                backgroundColor: item.role === 'user' ? '#fcdc3c' : colors.primary,
                            }
                        ]}>
                            <Text style={{
                                color: item.role === 'user' ? '#000' : '#fff',
                                fontSize: 16
                            }}>
                                {item.content}
                            </Text>
                        </View>
                    )}
                    onScroll={(e) => {
                        const offsetY = e.nativeEvent.contentOffset.y;
                        const contentHeight = e.nativeEvent.contentSize.height;
                        const layoutHeight = e.nativeEvent.layoutMeasurement.height;
                        setShowScrollToBottom(contentHeight - offsetY - layoutHeight > 30);
                    }}
                />

                <View style={[styles.inputContainer, {
                    borderColor: colors.border,
                    backgroundColor: colors.background
                }]}>
                    <TextInput
                        value={question}
                        onChangeText={setQuestion}
                        placeholder="메시지를 입력하세요"
                        placeholderTextColor={colors.subtext}
                        style={[styles.input, {
                            backgroundColor: colors.surface,
                            color: colors.text,
                            maxHeight: 100
                        }]}
                        multiline
                    />
                    <TouchableOpacity
                        onPress={handleAsk}
                        disabled={!question.trim()}
                        style={styles.sendButton}
                    >
                        <Ionicons
                            name="send"
                            size={24}
                            color={question.trim() ? colors.primary : colors.border}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {showOverlay && (
                <View style={styles.overlay}>
                    <LottieView source={currentLottie} autoPlay loop style={styles.lottie} />
                    <Text style={styles.loadingText}>
                        답변을 생성 중입니다...
                    </Text>
                </View>
            )}

            {showScrollToBottom && (
                <TouchableOpacity
                    onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    style={styles.scrollToBottomButton}
                >
                    <View style={[styles.scrollToBottomButtonInner, {
                        backgroundColor: colors.surface
                    }]}>
                        <Ionicons name="arrow-down" size={20} color={colors.text} />
                    </View>
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 25 : 0
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center'
    },
    keyboardAvoidingView: {
        flex: 1
    },
    flatListContent: {
        padding: 16,
        flexGrow: 1
    },
    messageContainer: {
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
        maxWidth: '80%'
    },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        alignItems: 'flex-end'
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16
    },
    sendButton: {
        marginLeft: 8,
        paddingBottom: 10
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    lottie: {
        width: 240,
        height: 240
    },
    loadingText: {
        color: '#fff',
        marginTop: 20,
        fontSize: 16,
        fontWeight: '600'
    },
    scrollToBottomButton: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        zIndex: 1000
    },
    scrollToBottomButtonInner: {
        borderRadius: 24,
        padding: 12
    }
});
