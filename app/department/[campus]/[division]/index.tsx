import React, { useLayoutEffect } from 'react';
import {View, Text, TouchableOpacity, SafeAreaView, Alert, Platform} from 'react-native';
import {router, useLocalSearchParams, useNavigation} from 'expo-router';
import { useAppTheme } from '@/app/context/ThemeContext';
import { useDesign } from '@/app/context/DesignSystem';
import {Ionicons} from "@expo/vector-icons";

export default function DivisionScreen() {
    const { campus, division } = useLocalSearchParams<{ campus: string; division: string }>();
    const { mode } = useAppTheme();
    const { colors, spacing, font, radius } = useDesign();

    const notReady = () => {
        Alert.alert('⏳ 준비 중입니다', '아직 준비되지 않은 기능이에요.');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg,paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: spacing.sm,
                marginBottom: spacing.md
            }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text, marginLeft: 8 }}>
                    이전으로
                </Text>
            </View>
            <View style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                padding: spacing.lg,
                shadowColor: mode === 'light' ? '#000' : 'transparent',
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
                marginBottom: spacing.lg
            }}>
                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>
                    {campus} - {division}
                </Text>
                <Text style={{ fontSize: font.caption, color: colors.subtext, marginTop: spacing.sm }}>
                    부서별 활동을 확인해보세요.
                </Text>
            </View>

            <TouchableOpacity
                onPress={notReady}
                style={{
                    backgroundColor: colors.primary,
                    paddingVertical: spacing.md,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    marginBottom: spacing.md
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: font.body }}>
                    📸 사진 보기 (준비 중)
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={notReady}
                style={{
                    backgroundColor: colors.primary,
                    paddingVertical: spacing.md,
                    borderRadius: radius.md,
                    alignItems: 'center',
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: font.body }}>
                    📝 게시판 (준비 중)
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}
