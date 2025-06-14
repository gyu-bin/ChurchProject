import { useDesign } from '@/app/context/DesignSystem';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import bcrypt from 'bcryptjs';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const { colors, spacing, font } = useDesign();
    const router = useRouter();

    // RN 환경 대응
    if (bcrypt.setRandomFallback) {
        bcrypt.setRandomFallback((len: number) => {
            return Array.from({ length: len }, () => Math.floor(Math.random() * 256));
        });
    }

    const handleReset = async () => {
        try {
            if (!email.trim()) return Alert.alert('입력 오류', '이메일을 입력해주세요.');

            const ref = doc(db, 'users', email.trim());
            const snap = await getDoc(ref);

            if (!snap.exists()) {
                return Alert.alert('실패', '해당 이메일의 계정이 없습니다.');
            }

            const hashed = bcrypt.hashSync('1234', 10);
            await updateDoc(ref, { password: hashed });

            setResetSuccess(true);
            Alert.alert('비밀번호 초기화 완료', '비밀번호가 1234로 초기화되었습니다.\n비밀번호를 꼭 변경해주세요.');
        } catch (err) {
            console.error('비밀번호 초기화 실패:', err);
            Alert.alert('오류', '비밀번호 초기화 중 문제가 발생했습니다.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>비밀번호 찾기</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* 중앙 콘텐츠 */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', bottom: '15%',paddingHorizontal: 32 }}>
                <Text style={[styles.title, { color: colors.text }]}>🔐 이메일을 입력하세요</Text>

                <TextInput
                    style={[
                        styles.input,
                        {
                            borderColor: colors.border,
                            color: colors.text,
                            backgroundColor: colors.card,
                        },
                    ]}
                    placeholder="이메일 주소"
                    placeholderTextColor={colors.subtext}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TouchableOpacity
                    onPress={handleReset}
                    style={[styles.button, { backgroundColor: colors.primary }]}
                >
                    <Text style={[styles.buttonText, { color: '#fff' }]}>비밀번호 초기화</Text>
                </TouchableOpacity>

                {resetSuccess && (
                    <View style={styles.successBox}>
                        <Text style={styles.successTitle}>✅ 초기화된 비밀번호: 1234</Text>
                        <Text style={styles.successSub}>로그인 후 꼭 비밀번호를 변경해주세요.</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 56,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    title: {
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 10,
        fontSize: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%',
        marginBottom: 24,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    successBox: {
        backgroundColor: '#e6f4ea',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2ecc71',
        alignItems: 'center',
    },
    successTitle: {
        color: '#2ecc71',
        fontWeight: 'bold',
        fontSize: 16,
    },
    successSub: {
        color: '#666',
        marginTop: 6,
        fontSize: 13,
    },
}); 