import React, {useEffect, useState} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    StyleSheet,
    SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '@/services/authService';
import { registerPushToken } from '@/services/registerPushToken';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();


    const handleLogin = async () => {
        try {
            const user = await login(email.trim(), password.trim());
            await AsyncStorage.setItem('currentUser', JSON.stringify(user));

            await registerPushToken(); // ✅ 바로 호출

            router.replace('/');

        } catch (error: any) {
            Alert.alert('로그인 실패', error.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>로그인</Text>

            <TextInput
                placeholder="이메일"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                placeholder="비밀번호"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>로그인</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={styles.linkText}>회원가입 하러가기</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#fff'
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 32,
        textAlign: 'center'
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
        fontSize: 16,
        backgroundColor: '#f9fafb'
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    linkText: {
        textAlign: 'center',
        color: '#3b82f6',
        fontSize: 14
    }
});
