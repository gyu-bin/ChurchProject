import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, SafeAreaView, Platform
} from 'react-native';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import bcrypt from 'bcryptjs';
import { useDesign } from '@/context/DesignSystem';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const { colors, spacing, font } = useDesign();

    // ✅ RN 환경 대응
    if (bcrypt.setRandomFallback) {
        bcrypt.setRandomFallback((len: number) => {
            const result = [];
            for (let i = 0; i < len; i++) {
                result.push(Math.floor(Math.random() * 256));
            }
            return result;
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
            Alert.alert('비밀번호 초기화 완료', '비밀번호가 1234로 초기화되었습니다.\n로그인 후 꼭 변경해주세요.');
        } catch (err) {
            console.error('비밀번호 초기화 실패:', err);
            Alert.alert('오류', '비밀번호 초기화 중 문제가 발생했습니다.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>🔑 비밀번호 찾기</Text>

            <TextInput
                style={[
                    styles.input,
                    {
                        borderColor: colors.border,
                        color: colors.text,
                        backgroundColor: colors.card,
                    },
                ]}
                placeholder="이메일을 입력하세요"
                placeholderTextColor={colors.subtext}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TouchableOpacity
                onPress={handleReset}
                style={[
                    styles.button,
                    {
                        backgroundColor: colors.primary,
                        marginTop: spacing.md,
                        marginBottom: spacing.lg,
                    },
                ]}
            >
                <Text style={[styles.buttonText, { color: '#fff' }]}>비밀번호 초기화</Text>
            </TouchableOpacity>

            {resetSuccess && (
                <View
                    style={{
                        backgroundColor: '#e6f4ea',
                        borderRadius: 8,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: '#2ecc71',
                    }}
                >
                    <Text style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: 15 }}>
                        ✅ 초기화된 비밀번호: 1234
                    </Text>
                    <Text style={{ color: colors.subtext, marginTop: 4, fontSize: 13 }}>
                        로그인 후 꼭 비밀번호를 변경해주세요.
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 25,
        justifyContent: 'center',
        paddingTop: Platform.OS === 'android' ? 20 : 0,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        fontSize: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        paddingHorizontal: 16,
    },
    button: {
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
