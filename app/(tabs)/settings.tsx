import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, Pressable, SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import ThemeToggle from "@/components/ThemeToggle";

export default function SettingsScreen() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const { mode, toggleTheme } = useAppTheme();
    const isDark = mode === 'dark';
    const { colors, spacing, font, radius } = useDesign();

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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
            <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg }}>
                ⚙️ 설정
            </Text>

            {/* 🔷 사용자 정보 카드 */}
            {user && (
                <View style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    marginBottom: spacing.lg,
                    shadowColor: mode === 'light' ? '#000' : 'transparent',
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

            <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
                <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text }}>🌓 다크모드 전환</Text>
                <ThemeToggle />
            </View>

            {/* 🧑‍💼 교역자 전용 페이지 버튼 */}
            {user?.role === '교역자' && (
                <TouchableOpacity
                    onPress={() => router.push('/pastor')}
                    style={{
                        backgroundColor: colors.primary,
                        paddingVertical: spacing.md,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        marginBottom: spacing.md
                    }}
                >
                    <Text style={{ color: '#fff', fontSize: font.body, fontWeight: '600' }}>
                        📌 교역자 전용 페이지
                    </Text>
                </TouchableOpacity>
            )}

            {/* 🚪 로그아웃 버튼 */}
            <TouchableOpacity
                onPress={handleLogout}
                style={{
                    backgroundColor: colors.error,
                    paddingVertical: spacing.md,
                    borderRadius: radius.md,
                    alignItems: 'center'
                }}
            >
                <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>
                    로그아웃
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}
