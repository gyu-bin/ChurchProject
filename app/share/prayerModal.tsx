import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {addDoc, collection, getDocs, serverTimestamp} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import {sendPushNotification} from "@/services/notificationService";
import Toast from "react-native-root-toast";

export default function PrayerSubmitPage() {
    const { colors, spacing, font, radius } = useDesign();
    const { mode } = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [user, setUser] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) {
                const userData = JSON.parse(raw);
                setCurrentUser(userData);
                setUser(userData);
            }
        };
        loadUser();
    }, []);

    const sendUrgentPrayerNotification = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            const sentTokens = new Set<string>();
            const pushPromises: Promise<void>[] = [];

            snapshot.docs.forEach((docSnap) => {
                const user = docSnap.data();
                const tokens: string[] = user.expoPushTokens || [];

                tokens.forEach(token => {
                    if (
                        typeof token === 'string' &&
                        token.startsWith('ExponentPushToken') &&
                        !sentTokens.has(token)
                    ) {
                        sentTokens.add(token);

                        pushPromises.push(sendPushNotification({
                            to: token,
                            title: '🙏 긴급 기도제목 요청',
                            body: '지금 함께 기도해주세요.',
                            data: { screen: 'prayer' },
                        }));
                    }
                });
            });

            await Promise.all(pushPromises);
            console.log(`✅ 긴급 기도제목 푸시 ${sentTokens.size}명에게 전송 완료`);
        } catch (err) {
            console.error('❌ 긴급 기도제목 푸시 전송 실패:', err);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) return;

        try {
            await addDoc(collection(db, 'prayer_requests'), {
                title,
                content,
                name: currentUser?.name,
                email: user?.email ?? '',
                createdAt: serverTimestamp(),
                anonymous: isAnonymous ? 'Y' : 'N',
                urgent: isUrgent ? 'Y' : 'N',
            });

            if (isUrgent) {
                await sendUrgentPrayerNotification();
            }

            Toast.show('✅ 제출되었습니다')
            router.back();
        } catch (error) {
            console.error('기도제목 등록 오류:', error);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={{ flex: 1, padding: spacing.lg }}>
                        <Text
                            style={{
                                fontSize: font.heading,
                                fontWeight: 'bold',
                                color: colors.text,
                                marginBottom: spacing.lg,
                                marginTop: insets.top + 10,
                            }}
                        >
                            🙏 기도제목 나누기
                        </Text>

                        <TextInput
                            placeholder="제목을 입력하세요"
                            placeholderTextColor={colors.placeholder}
                            value={title}
                            onChangeText={setTitle}
                            style={{
                                fontSize: font.body,
                                paddingVertical: spacing.sm,
                                paddingHorizontal: spacing.md,
                                borderBottomWidth: 1,
                                borderColor: colors.border,
                                color: colors.text,
                                marginBottom: spacing.lg,
                            }}
                        />

                        <TextInput
                            placeholder="기도 제목을 입력하세요"
                            placeholderTextColor={colors.placeholder}
                            value={content}
                            onChangeText={setContent}
                            multiline
                            scrollEnabled={true} // ✅ 내부 스크롤 활성화
                            textAlignVertical="top" // ✅ 내용 위에서부터 시작
                            style={{
                                fontSize: font.body,
                                paddingVertical: spacing.sm,
                                paddingHorizontal: spacing.md,
                                borderBottomWidth: 1,
                                borderColor: colors.border,
                                color: colors.text,
                                marginBottom: spacing.lg,
                                maxHeight: 150, // ✅ 최대 높이 제한
                            }}
                        />

                        <Text
                            style={{
                                fontSize: font.caption,
                                fontWeight: '600',
                                color: colors.subtext,
                                marginBottom: spacing.sm,
                            }}
                        >
                            익명 여부
                        </Text>

                        <TouchableOpacity
                            onPress={() => setIsAnonymous(prev => !prev)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: spacing.lg,
                            }}
                        >
                            <View
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderWidth: 1.5,
                                    borderColor: colors.primary,
                                    backgroundColor: isAnonymous ? colors.primary : colors.surface,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 10,
                                    borderRadius: 4,
                                }}
                            >
                                {isAnonymous && (
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                                )}
                            </View>
                            <Text style={{ fontSize: font.body, color: colors.text }}>
                                이름을 표시하지 않고 익명으로 나눌래요
                            </Text>
                        </TouchableOpacity>

                        <Text
                            style={{
                                fontSize: font.caption,
                                fontWeight: '600',
                                color: colors.subtext,
                                marginBottom: spacing.sm,
                            }}
                        >
                            긴급 기도제목 여부
                        </Text>

                        <TouchableOpacity
                            onPress={() => setIsUrgent(prev => !prev)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: spacing.lg,
                            }}
                        >
                            <View
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderWidth: 1.5,
                                    borderColor: colors.error,
                                    backgroundColor: isUrgent ? colors.error : colors.surface,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 10,
                                    borderRadius: 4,
                                }}
                            >
                                {isUrgent && (
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>!</Text>
                                )}
                            </View>
                            <Text style={{ fontSize: font.body, color: colors.text }}>
                                모든 사람에게 알림을 보내요
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSubmit}
                            style={{
                                backgroundColor: colors.primary,
                                paddingVertical: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                                marginBottom: spacing.md,
                            }}
                        >
                            <Text
                                style={{
                                    color: '#fff',
                                    fontSize: font.body,
                                    fontWeight: 'bold',
                                }}
                            >
                                🙏 제출하기
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                alignItems: 'center',
                                paddingVertical: spacing.sm,
                                backgroundColor: colors.border,
                                borderRadius: radius.md,
                                height: 40,
                            }}
                        >
                            <Text style={{ color: colors.text, fontSize: font.caption, fontWeight: '500' }}>
                                닫기
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}
