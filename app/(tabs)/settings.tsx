import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, SafeAreaView, Platform, ScrollView, KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import ThemeToggle from "@/components/ThemeToggle";
import PushSettings from "@/components/VerseNotificationSettings";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const { colors, spacing, font, radius } = useDesign();
    const insets = useSafeAreaInsets();
    const horizontalMargin = Platform.OS === 'ios' ? 20 : 16;

    useEffect(() => {
        const fetchUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) setUser(JSON.parse(raw));
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('currentUser');
        router.replace('/auth/login');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={{
                        paddingTop: spacing.lg,
                        paddingBottom: 40,
                        paddingHorizontal: horizontalMargin,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg }}>
                        ⚙️ 설정
                    </Text>

                    {user && (
                        <View style={{
                            backgroundColor: colors.surface,
                            borderRadius: radius.lg,
                            padding: spacing.lg,
                            marginBottom: spacing.lg,
                            shadowColor: isDark ? 'transparent' : '#000',
                            shadowOpacity: 0.05,
                            shadowRadius: 6,
                            elevation: 2,
                        }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: spacing.sm, color: colors.primary }}>
                                🙋 내 정보
                            </Text>

                            {[
                                { label: '이름', value: user.name },
                                { label: '이메일', value: user.email },
                                { label: '캠퍼스', value: user.campus },
                                { label: '소속', value: user.division },
                                { label: '역할', value: user.role },
                            ].map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', marginBottom: 6 }}>
                                    <Text style={{ fontWeight: '600', color: colors.subtext, width: 70 }}>{item.label}</Text>
                                    <Text style={{ color: colors.text }}>{item.value}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <View
                        style={{
                            backgroundColor: colors.card,
                            paddingVertical: 20,
                            paddingHorizontal: 16,
                            borderRadius: 12,
                            marginVertical: spacing.md,
                            alignSelf: 'stretch',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 4,
                            flexDirection: 'row', // ✅ 가로 정렬
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text }}>
                            🌓 다크모드 전환
                        </Text>
                        <ThemeToggle />
                    </View>

                    {/*말씀알림*/}
                    <PushSettings/>

                    {user?.role === '교역자' && (
                        <TouchableOpacity
                            onPress={() => router.push('/pastor/pastor')}
                            style={{
                                backgroundColor: colors.primary,
                                paddingVertical: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                                marginBottom: spacing.md,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: font.body, fontWeight: '600' }}>
                                📌 교역자 전용 페이지
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={handleLogout}
                        style={{
                            backgroundColor: colors.error,
                            paddingVertical: spacing.md,
                            borderRadius: radius.md,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>
                            로그아웃
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
