import { useAuth } from '@/hooks/useAuth';
import { login } from '@/services/authService';
import { registerDevice } from '@/services/registerDevice';
import { registerPushToken } from '@/services/registerPushToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from "react-native-root-toast"; // 경로는 실제 위치에 맞게

import loading4 from '@/assets/lottie/Animation - 1747201330128.json';
import loading3 from '@/assets/lottie/Animation - 1747201413764.json';
import loading2 from '@/assets/lottie/Animation - 1747201431992.json';
import loading1 from '@/assets/lottie/Animation - 1747201461030.json';
import { Ionicons } from "@expo/vector-icons";


export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const { reload } = useAuth();

    const [loading, setLoading] = useState(false);
    const [loadingAnimation, setLoadingAnimation] = useState<any>(null); // 선택된 애니메이션

    const loadingAnimations = [loading1, loading2, loading3, loading4];
    const [buttonDisabled, setButtonDisabled] = useState(false);
    const [autoLoginChecked, setAutoLoginChecked] = useState(false);

    useEffect(() => {
        const checkAutoLogin = async () => {
            const saved = await AsyncStorage.getItem('autoLogin');
            if (saved === 'true') {
                const raw = await AsyncStorage.getItem('currentUser');
                if (raw) {
                    const user = JSON.parse(raw);
                    await AsyncStorage.setItem('isLoggedIn', 'true'); // isLoggedIn 상태 추가
                    await registerPushToken();
                    await registerDevice();
                    await reload();
                    router.replace('/(tabs)/home'); // 홈 화면으로 직접 이동
                }
            }
        };

        checkAutoLogin();
    }, []);

    const handleLogin = async () => {
        if (buttonDisabled) return;
        setButtonDisabled(true);

        // 먼저 랜덤 로딩 애니메이션 선택 후 로딩 상태 설정
        const randomIndex = Math.floor(Math.random() * loadingAnimations.length);
        setLoadingAnimation(loadingAnimations[randomIndex]);
        setLoading(true);

        try {
            const user = await login(email.trim(), password.trim());
            await AsyncStorage.setItem('isLoggedIn', 'true');
            await AsyncStorage.setItem('currentUser', JSON.stringify(user)); // 사용자 저장

            // 자동 로그인 설정 처리
            if (autoLoginChecked) {
                await AsyncStorage.setItem('autoLogin', 'true');
            } else {
                await AsyncStorage.removeItem('autoLogin');
            }

            // 디바이스 및 푸시 토큰 등록
            try {
                await registerPushToken();
                await registerDevice();
            } catch (regError) {
                console.error('토큰 등록 실패:', regError);
                // 토큰 등록 실패해도 로그인은 진행
            }

            await reload(); // 사용자 상태 즉시 로드

            // 로그인 성공 메시지
            Toast.show('로그인 성공!', {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
            });

            router.replace('/(tabs)/home'); // 홈 화면으로 직접 이동
        } catch (error:any) {
            console.error('로그인 실패:', error.message);
            Alert.alert('로그인 실패', error.message || '이메일과 비밀번호를 확인해주세요.');
        } finally {
            setLoading(false);
            setButtonDisabled(false);
        }
    };

    return (
        <SafeAreaView style={styles.wrapper}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.scrollContainer}>
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

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <TouchableOpacity onPress={() => setAutoLoginChecked(prev => !prev)} style={{ marginRight: 8 }}>
                                <Ionicons
                                    name={autoLoginChecked ? 'checkbox' : 'square-outline'}
                                    size={24}
                                    color="#2563eb"
                                />
                            </TouchableOpacity>
                            <Text style={{ color: '#111827', fontSize: 14 }}>자동 로그인</Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading || buttonDisabled}
                            style={[styles.button, (loading || buttonDisabled) && { opacity: 0.5 }]}
                        >
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
                            onPress={() => router.push('/auth/ForgotPassword')}
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
                </View>
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
