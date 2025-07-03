import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { useDesign } from '@/context/DesignSystem';
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from '@expo/vector-icons';

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function SermonQuestionModal({ visible, onClose }: Props) {
    const { colors, spacing, radius, font } = useDesign();
    const { user } = useAuth();

    const [content, setContent] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const handleSubmit = async () => {
        if (!content.trim()) return;

        try {
            await addDoc(collection(db, 'sermon_questions'), {
                content,
                author: isAnonymous ? '익명' : (user?.name ?? '익명'),
                createdAt: serverTimestamp(),
            });

            setContent('');
            setIsAnonymous(false);
            onClose();
        } catch (error) {
            console.error('질문 저장 실패:', error);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)', // 반투명 배경
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <View style={{
                        width: '95%', // ✅ 거의 전체 너비
                        height: '85%', // ✅ 높이도 크게
                        backgroundColor: colors.background,
                        borderRadius: radius.lg,
                        padding: spacing.lg,
                    }}>
                        {/* 헤더 */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: spacing.lg,
                        }}>
                            <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text }}>
                                ❓ 질문 작성
                            </Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* 입력창들 */}
                        <TextInput
                            placeholder="질문 내용 입력"
                            value={content}
                            onChangeText={setContent}
                            placeholderTextColor={colors.subtext}
                            multiline
                            style={{
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: radius.md,
                                padding: spacing.md,
                                minHeight: 200, // ✅ 내용 입력창도 크게
                                textAlignVertical: 'top',
                                color: colors.text,
                                marginBottom: spacing.md,
                                flex: 1, // ✅ 남은 공간 채우기
                            }}
                        />
                        <TouchableOpacity
                            onPress={() => setIsAnonymous(!isAnonymous)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: spacing.lg,
                            }}
                        >
                            <View
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderWidth: 1,
                                    borderColor: colors.primary,
                                    backgroundColor: isAnonymous ? colors.primary : colors.surface,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 4,
                                    marginRight: spacing.sm,
                                }}
                            >
                                {isAnonymous && (
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>
                                )}
                            </View>
                            <Text style={{ color: colors.text, fontSize: 14 }}>
                                이름을 표시하지 않고 익명으로 작성
                            </Text>
                        </TouchableOpacity>

                        {/* 작성 버튼 */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            style={{
                                backgroundColor: colors.primary,
                                padding: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                                marginTop: spacing.lg,
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>작성 완료</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
