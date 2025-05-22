import React, {useEffect, useState} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '@/services/authService';
import { registerPushToken } from '@/services/registerPushToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { registerDevice } from '@/services/registerDevice';
import {tryBiometricLogin} from "@/utils/biometricLogin";
import Toast from "react-native-root-toast"; // 경로는 실제 위치에 맞게
import LottieView from 'lottie-react-native';

import loading1 from '@/assets/lottie/Animation - 1747201461030.json'
import loading2 from '@/assets/lottie/Animation - 1747201431992.json'
import loading3 from '@/assets/lottie/Animation - 1747201413764.json'
import loading4 from '@/assets/lottie/Animation - 1747201330128.json'


export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const { reload } = useAuth();

    const [loading, setLoading] = useState(false);
    const [loadingAnimation, setLoadingAnimation] = useState<any>(null); // 선택된 애니메이션

    const loadingAnimations = [loading1, loading2, loading3, loading4];

    // 로그인 화면 useEffect에서 자동 시도
    useEffect(() => {
        const attemptBiometric = async () => {
            const user = await tryBiometricLogin();
            if (user) {
                await registerPushToken(); // 자동 로그인 처리
                router.replace('/');
            }
        };

        attemptBiometric();
    }, []);

    const handleLogin = async () => {
        setLoading(true); // ✅ 1. 로딩 상태 바로 반영 시도
        setLoadingAnimation(loadingAnimations[Math.floor(Math.random() * loadingAnimations.length)]);

        try {
            const user = await login(email.trim(), password.trim());
            await AsyncStorage.setItem('currentUser', JSON.stringify(user));

            // const saved = await AsyncStorage.getItem(`useBiometric:${user.email}`);
            /*if (saved !== 'true') {
                console.log('face id')
                Alert.alert(
                    'Face ID 등록',
                    '다음 로그인부터 Face ID를 사용하시겠습니까?',
                    [
                        { text: '아니오', style: 'cancel' },
                        {
                            text: '예',
                            onPress: async () => {
                                await AsyncStorage.setItem(`useBiometric:${user.email}`, 'true');
                                Toast.show('✅ Face ID가 등록되었습니다.');
                            },
                        },
                    ]
                );
            }*/

            await registerPushToken();
            await registerDevice();    // ✅ 기기 등록 추가
            await reload();
            setTimeout(() => {
                setLoading(false);
                router.replace('/');
            }, 2000);
        } catch (error: any) {
            Alert.alert('로그인 실패', error.message);
        }
    };

    return (
        <SafeAreaView style={styles.wrapper}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
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

                        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                            <Text style={styles.buttonText}>로그인</Text>
                        </TouchableOpacity>
                        <Modal visible={loading} transparent animationType="fade">
                            <View
                                style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                }}
                            >
                                {loadingAnimation && (
                                    <LottieView
                                        source={loadingAnimation}
                                        autoPlay
                                        loop
                                        style={{ width: 300, height: 300 }}
                                    />
                                )}
                                <Text style={{ color: '#fff', marginTop: 20, fontSize: 16 }}>로그인 중...</Text>
                            </View>
                        </Modal>

                        <TouchableOpacity
                            onPress={() => router.push('/setting/ForgotPassword')}
                            style={{
                                backgroundColor: '#fff5f5',
                                paddingVertical: 14,
                                paddingHorizontal: 20,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#f87171',
                                alignItems: 'center',
                                marginBottom: 24,
                            }}
                        >
                            <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>비밀번호를 잊으셨나요?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.push('/auth/register')}>
                            <Text style={styles.linkText}>
                                아직 회원이 아니신가요? <Text style={styles.link}>회원가입</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
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
