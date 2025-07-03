import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Keyboard,
    Dimensions,
} from 'react-native';
import { useDesign } from '@/context/DesignSystem';
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function SermonShareWrite({ visible, onClose }: Props) {
    const { colors, spacing, radius, font } = useDesign();
    const { user } = useAuth();

    const [date, setDate] = useState('');
    const [title, setTitle] = useState('');
    const [preacher, setPreacher] = useState('');
    const [content, setContent] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) return;

        try {
            await addDoc(collection(db, 'sermon_shares'), {
                date,
                title,
                preacher,
                content,
                author: isAnonymous ? '익명' : (user?.name ?? '알 수 없음'),
                anonymous: isAnonymous,
                createdAt: serverTimestamp(),
            });

            setDate('');
            setTitle('');
            setPreacher('');
            setContent('');
            setIsAnonymous(false);
            onClose();
        } catch (error) {
            console.error('설교 나눔 저장 실패:', error);
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
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <View style={{
                        width: '95%', // 거의 전체 가로 폭
                        height: height * 0.85, // 거의 전체 세로 높이
                        backgroundColor: colors.background,
                        borderRadius: radius.lg * 1.5, // 모서리 조금 더 둥글게
                        padding: spacing.lg * 1.2,
                    }}>
                        {/* 헤더 */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: spacing.lg,
                        }}>
                            <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text }}>
                                📖 설교 나눔 작성
                            </Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* 입력창 */}
                        <TextInput
                            placeholder="설교 제목"
                            value={title}
                            onChangeText={setTitle}
                            placeholderTextColor={colors.subtext}
                            style={{
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: radius.md,
                                padding: spacing.md,
                                marginBottom: spacing.sm,
                                color: colors.text,
                            }}
                        />

                        <TextInput
                            placeholder="설교자"
                            value={preacher}
                            onChangeText={setPreacher}
                            placeholderTextColor={colors.subtext}
                            style={{
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: radius.md,
                                padding: spacing.md,
                                marginBottom: spacing.sm,
                                color: colors.text,
                            }}
                        />

                        <TextInput
                            placeholder="내용 입력"
                            value={content}
                            onChangeText={setContent}
                            placeholderTextColor={colors.subtext}
                            multiline
                            scrollEnabled // ✅ 내용이 넘치면 내부 스크롤
                            style={{
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: radius.md,
                                padding: spacing.md,
                                height: height * 0.3, // 🔥 높이 고정
                                textAlignVertical: 'top',
                                color: colors.text,
                                marginBottom: spacing.md,
                            }}
                        />

                        {/* 익명 토글 */}
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
