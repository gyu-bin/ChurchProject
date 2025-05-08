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
                    backgroundColor: colors.card,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    marginBottom: spacing.lg,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2
                }}>
                    <Text style={{ fontSize: font.body, color: colors.text }}>이름: {user.name}</Text>
                    <Text style={{ fontSize: font.body, color: colors.text }}>이메일: {user.email}</Text>
                    <Text style={{ fontSize: font.body, color: colors.text }}>캠퍼스: {user.campus}</Text>
                    <Text style={{ fontSize: font.body, color: colors.text }}>소속: {user.division}</Text>
                    <Text style={{ fontSize: font.body, color: colors.text }}>역할: {user.role}</Text>
                </View>
            )}

            {/* 🔆 다크모드 전환 */}
            {/*<View style={{*/}
            {/*    backgroundColor: colors.card,*/}
            {/*    padding: spacing.lg,*/}
            {/*    borderRadius: radius.lg,*/}
            {/*    marginBottom: spacing.lg,*/}
            {/*    alignItems: 'center'*/}
            {/*}}>*/}
            {/*    <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text }}>🌓 다크모드 전환</Text>*/}
            {/*    <View style={{*/}
            {/*        flexDirection: 'row',*/}
            {/*        backgroundColor: colors.border,*/}
            {/*        borderRadius: radius.xl,*/}
            {/*        marginTop: spacing.sm,*/}
            {/*        overflow: 'hidden',*/}
            {/*    }}>*/}
            {/*        <Pressable*/}
            {/*            style={{*/}
            {/*                flex: 1,*/}
            {/*                paddingVertical: spacing.sm,*/}
            {/*                alignItems: 'center',*/}
            {/*                backgroundColor: !isDark ? colors.primary : colors.surface,*/}
            {/*            }}*/}
            {/*            onPress={() => { if (isDark) toggleTheme(); }}*/}
            {/*        >*/}
            {/*            <Text style={{*/}
            {/*                fontWeight: '600',*/}
            {/*                color: !isDark ? '#ffffff' : colors.text*/}
            {/*            }}>Light</Text>*/}
            {/*        </Pressable>*/}

            {/*        <Pressable*/}
            {/*            style={{*/}
            {/*                flex: 1,*/}
            {/*                paddingVertical: spacing.sm,*/}
            {/*                alignItems: 'center',*/}
            {/*                backgroundColor: isDark ? colors.primary : colors.surface,*/}
            {/*            }}*/}
            {/*            onPress={() => { if (!isDark) toggleTheme(); }}*/}
            {/*        >*/}
            {/*            <Text style={{*/}
            {/*                fontWeight: '600',*/}
            {/*                color: isDark ? '#ffffff' : colors.text*/}
            {/*            }}>Dark</Text>*/}
            {/*        </Pressable>*/}
            {/*    </View>*/}
            {/*</View>*/}

            <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
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
