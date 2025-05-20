import React from 'react';
import {
    Modal,
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';

interface PrayerModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: () => void;
    name: string;
    title: string;
    content: string;
    email: string; // ✅ 추가
    visibility: 'all' | 'pastor';
    setTitle: (text: string) => void;
    setContent: (text: string) => void;
    setVisibility: (v: 'all' | 'pastor') => void;
}

export default function PrayerModal({
                                        visible,
                                        onClose,
                                        onSubmit,
                                        name,
                                        title,
                                        content,
                                        email,
                                        visibility,
                                        setTitle,
                                        setContent,
                                        setVisibility,
                                    }: PrayerModalProps) {
    const { mode } = useAppTheme();
    const { colors, spacing, font, radius } = useDesign();

    return (
        <Modal visible={visible} animationType="slide">
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg }}>
                            <Text
                                style={{
                                    fontSize: font.heading,
                                    fontWeight: 'bold',
                                    color: colors.text,
                                    marginBottom: spacing.lg,
                                }}
                            >
                                🙏 기도제목 나누기
                            </Text>

                            <View style={{ marginBottom: spacing.lg }}>
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
                                    }}
                                />
                            </View>

                            <View style={{ marginBottom: spacing.lg }}>
                                <TextInput
                                    placeholder="기도 제목을 입력하세요"
                                    placeholderTextColor={colors.placeholder}
                                    value={content}
                                    onChangeText={setContent}
                                    multiline
                                    style={{
                                        fontSize: font.body,
                                        paddingVertical: spacing.sm,
                                        paddingHorizontal: spacing.md,
                                        borderBottomWidth: 1,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    }}
                                />
                            </View>

                            <View style={{ marginBottom: spacing.lg }}>
                                <Text
                                    style={{
                                        fontSize: font.caption,
                                        fontWeight: '600',
                                        color: colors.subtext,
                                        marginBottom: spacing.sm,
                                    }}
                                >
                                    공개 범위
                                </Text>
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                    <TouchableOpacity
                                        onPress={() => setVisibility('all')}
                                        style={{
                                            borderWidth: 1,
                                            borderColor: visibility === 'all' ? colors.primary : colors.border,
                                            backgroundColor: visibility === 'all' ? colors.primary : colors.surface,
                                            borderRadius: 999,
                                            paddingVertical: spacing.sm,
                                            paddingHorizontal: spacing.md,
                                            // marginRight: spacing.sm,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: font.caption,
                                                fontWeight: 'bold',
                                                // fontWeight: visibility === 'all' ? 'bold' : 'normal',
                                                color: visibility === 'all' ? '#fff' : colors.text,
                                            }}
                                        >
                                            전체공개
                                        </Text>
                                    </TouchableOpacity>

                                    {/*<TouchableOpacity
                                        onPress={() => setVisibility('setting')}
                                        style={{
                                            borderWidth: 1,
                                            borderColor: visibility === 'setting' ? colors.primary : colors.border,
                                            backgroundColor: visibility === 'setting' ? colors.primary : colors.surface,
                                            borderRadius: 999,
                                            paddingVertical: spacing.sm,
                                            paddingHorizontal: spacing.md,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: font.caption,
                                                fontWeight: visibility === 'setting' ? 'bold' : 'normal',
                                                color: visibility === 'setting' ? '#fff' : colors.text,
                                            }}
                                        >
                                            교역자만
                                        </Text>
                                    </TouchableOpacity>*/}
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={onSubmit}
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
                                onPress={onClose}
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
        </Modal>
    );
}
