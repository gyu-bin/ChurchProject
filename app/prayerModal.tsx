// components/PrayerModal.tsx
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

interface PrayerModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: () => void;
    name: string;
    title: string;
    content: string;
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
                                        visibility,
                                        setTitle,
                                        setContent,
                                        setVisibility,
                                    }: PrayerModalProps) {
    return (
        <Modal visible={visible} animationType="slide">
            <SafeAreaView style={styles.modalContainer}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <View style={styles.innerWrapper}>
                            <Text style={styles.modalTitle}>🙏 기도제목 나누기</Text>

                            <View style={styles.inputGroup}>
                                <TextInput
                                    placeholder="제목을 입력하세요"
                                    placeholderTextColor="#9ca3af"
                                    value={title}
                                    onChangeText={setTitle}
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <TextInput
                                    placeholder="기도 제목을 입력하세요"
                                    placeholderTextColor="#9ca3af"
                                    value={content}
                                    onChangeText={setContent}
                                    multiline
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>공개 범위</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity
                                        onPress={() => setVisibility('all')}
                                        style={[styles.tag, visibility === 'all' && styles.tagSelected]}
                                    >
                                        <Text
                                            style={[styles.tagText, visibility === 'all' && styles.tagTextSelected]}
                                        >
                                            전체공개
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setVisibility('pastor')}
                                        style={[styles.tag, visibility === 'pastor' && styles.tagSelected]}
                                    >
                                        <Text
                                            style={[styles.tagText, visibility === 'pastor' && styles.tagTextSelected]}
                                        >
                                            교역자만
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity onPress={onSubmit} style={styles.submitButton}>
                                <Text style={styles.submitText}>🙏 제출하기</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Text style={styles.closeText}>닫기</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
    },
    innerWrapper: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 32,
        textAlign: 'left',
    },
    inputGroup: {
        marginBottom: 28,
    },
    input: {
        fontSize: 18,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderColor: '#e5e7eb',
        color: '#111827',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 8,
    },
    tag: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 8,
        backgroundColor: '#fff',
    },
    tagSelected: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    tagText: {
        fontSize: 14,
        color: '#374151',
    },
    tagTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: '#3182f6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    submitText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    closeButton: {
        alignItems: 'center',
        marginTop: 32,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingVertical: 12,
    },
    closeText: {
        color: '#374151',
        fontSize: 15,
        fontWeight: '500',
    },
});
