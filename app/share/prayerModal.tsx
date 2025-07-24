import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { useAddPrayer, usePrayers } from '@/hooks/usePrayers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import Toast from "react-native-root-toast";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const [submitLoading, setSubmitLoading] = useState(false);

    const { data: prayerRequests, refetch } = usePrayers('all');

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
            // This function is no longer needed as useAddPrayer handles notifications
            // Keeping it for now as it might be used elsewhere or for context,
            // but it will be removed once useAddPrayer is fully integrated.
            console.log('sendUrgentPrayerNotification is deprecated and will be removed.');
        } catch (err) {
            console.error('❌ 긴급 기도제목 푸시 전송 실패:', err);
        }
    };

    const { mutate: addPrayer } = useAddPrayer();

    const handlePray = async (id: string, prayed: boolean, userEmail: string) => {
        const ref = doc(db, 'prayer_requests', id);
        await updateDoc(ref, {
            prayedUsers: prayed ? arrayRemove(userEmail) : arrayUnion(userEmail),
        });
        refetch();
    };

    const handleSubmit = () => {
        if (submitLoading) return;
        if (!title.trim() || !content.trim()) return;
        setSubmitLoading(true);
        addPrayer(
            {
                title,
                content,
                name: currentUser?.name,
                email: user?.email ?? '',
                anonymous: isAnonymous ? 'Y' : 'N',
                urgent: isUrgent ? 'Y' : 'N',
            },
            {
                onSuccess: () => {
                    Toast.show('✅ 제출되었습니다');
                    setSubmitLoading(false);
                    router.back();
                },
                onError: (error: any) => {
                    console.error('기도제목 등록 오류:', error);
                    Toast.show('❌ 제출에 실패했습니다');
                    setSubmitLoading(false);
                },
            }
        );
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

                        {(user?.role === '관리자' || user?.role === '교역자') && (
                            <>
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
                                        긴급 표시가 생겨요
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity
                            onPress={submitLoading ? undefined : handleSubmit}
                            disabled={submitLoading}
                            style={{
                                backgroundColor: colors.primary,
                                paddingVertical: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                                marginBottom: spacing.md,
                                opacity: submitLoading ? 0.7 : 1,
                            }}
                        >
                            {submitLoading ? (
                                <ActivityIndicator color='#fff' />
                            ) : (
                                <Text
                                    style={{
                                        color: '#fff',
                                        fontSize: font.body,
                                        fontWeight: 'bold',
                                    }}
                                >
                                    🙏 제출하기
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                alignItems: 'center',
                                justifyContent: 'center',
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
