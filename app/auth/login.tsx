import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    StyleSheet,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '@/services/authService';
import { registerPushToken } from '@/services/registerPushToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const { reload } = useAuth(); // ✅ reload 훅 불러오기

    const handleLogin = async () => {
        try {
            const user = await login(email.trim(), password.trim());
            await AsyncStorage.setItem('currentUser', JSON.stringify(user));
            await registerPushToken();
            await reload(); // ✅ 로그인 직후 상태 갱신
            router.replace('/');
        } catch (error: any) {
            Alert.alert('로그인 실패', error.message);
        }
    };

    return (
        <SafeAreaView style={styles.wrapper}>
            <View style={styles.container}>
                <Text style={styles.title}>로그인</Text>

                <View style={styles.inputGroup}>
                    <TextInput
                        placeholder="이메일"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <TextInput
                        placeholder="비밀번호"
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        secureTextEntry
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>로그인</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/auth/register')}>
                    <Text style={styles.linkText}>
                        아직 회원이 아니신가요? <Text style={styles.link}>회원가입</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 100,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 48,
        textAlign: 'left',
        color: '#1f2937',
    },
    inputGroup: {
        borderBottomWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 28,
    },
    input: {
        fontSize: 18,
        paddingVertical: 12,
        color: '#111827',
    },
    button: {
        backgroundColor: '#3182f6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 32,
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    linkText: {
        textAlign: 'center',
        fontSize: 14,
        color: '#6b7280',
    },
    link: {
        color: '#3182f6',
        fontWeight: '500',
    },
});
