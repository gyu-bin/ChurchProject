import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase/config';
import {Ionicons} from "@expo/vector-icons";
import {router} from "expo-router";

export default function SettingsFeedbackScreen() {
    const insets = useSafeAreaInsets();
    const { colors, spacing, font, radius } = useDesign();
    const { mode } = useAppTheme();

    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) {
            Alert.alert('내용을 입력해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const raw = await AsyncStorage.getItem('currentUser');
            const user = raw ? JSON.parse(raw) : {};

            await addDoc(collection(db, 'feedbacks'), {
                email: user.email || 'unknown',
                name: user.name || '익명',
                content,
                createdAt: new Date(),
            });

            Alert.alert('의견이 제출되었습니다. 감사합니다!');
            setContent('');
        } catch (err) {
            Alert.alert('제출 오류', '피드백 제출에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background,paddingTop: Platform.OS === 'android' ? insets.top + 20 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: 30 }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: font.heading, fontWeight: '600', color: colors.text, textAlign: 'center', flex: 1 }}>피드백 하기</Text>
            </View>
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    padding: spacing.lg,
                    paddingTop: insets.top + spacing.lg,
                    backgroundColor: colors.background,
                }}
            >
                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg }}>
                    ✉️ 피드백 보내기
                </Text>

                <Text style={{ color: colors.subtext, marginBottom: spacing.sm }}>
                    앱 사용 중 불편한 점이나 개선 의견을 자유롭게 작성해주세요.
                </Text>

                <TextInput
                    style={{
                        height: 180,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        color: colors.text,
                        textAlignVertical: 'top',
                        backgroundColor: colors.surface,
                    }}
                    multiline
                    placeholder="여기에 작성해주세요..."
                    placeholderTextColor={colors.subtext}
                    value={content}
                    onChangeText={setContent}
                />

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting}
                    style={{
                        marginTop: spacing.lg,
                        backgroundColor: colors.primary,
                        padding: spacing.md,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        opacity: submitting ? 0.5 : 1,
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>제출하기</Text>
                </TouchableOpacity>
            </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}
