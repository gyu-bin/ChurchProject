import React, { useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';

export default function DivisionScreen() {
    const { campus, division } = useLocalSearchParams<{ campus: string; division: string }>();
    const navigation = useNavigation();
    const { mode } = useAppTheme();
    const { colors, spacing, font, radius } = useDesign();

    useLayoutEffect(() => {
        navigation.setOptions({
            title: `${campus} - ${division}`,
        });
    }, [navigation, campus, division]);

    const notReady = () => {
        Alert.alert('⏳ 준비 중입니다', '아직 준비되지 않은 기능이에요.');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
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
