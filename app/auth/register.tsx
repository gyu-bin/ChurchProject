// ✅ Firebase Auth 기반 회원가입 + Firestore 사용자 정보 저장 + 비밀번호 보기 토글

import React, { useRef, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, Animated, Dimensions,
    SafeAreaView, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { db } from '@/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { registerPushToken } from '@/services/registerPushToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from "bcryptjs";
import LottieView from 'lottie-react-native';

import loading1 from '@/assets/lottie/Animation - 1747201461030.json'
import loading2 from '@/assets/lottie/Animation - 1747201431992.json'
import loading3 from '@/assets/lottie/Animation - 1747201413764.json'
import loading4 from '@/assets/lottie/Animation - 1747201330128.json'
import {useAuth} from "@/hooks/useAuth";

const SCREEN_WIDTH = Dimensions.get('window').width;
const campuses = ['문래', '신촌'];
const divisions = ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'];
const roles = ['새가족', '정회원', '교역자'];

export default function RegisterSlideScreen() {
    const router = useRouter();
    const slideX = useRef(new Animated.Value(0)).current;
    const [step, setStep] = useState(0);
    const inputRefs = useRef<Record<string, TextInput | null>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingAnimation, setLoadingAnimation] = useState<any>(null); // 선택된 애니메이션

    const loadingAnimations = [loading1, loading2, loading3, loading4];

    const { reload } = useAuth(); // 컴포넌트 상단에서 선언

    const steps = ['email', 'password', 'confirm', 'name', 'campus', 'division', 'role'] as const;

    if (!bcrypt.setRandomFallback) {
        console.warn('⚠️ bcryptjs 버전이 올바르지 않습니다.');
    }

// ✅ RN 환경에서는 setRandomFallback을 등록해줘야 합니다
    bcrypt.setRandomFallback((len: number) => {
        const result = [];
        for (let i = 0; i < len; i++) {
            result.push(Math.floor(Math.random() * 256));
        }
        return result;
    });

    const [form, setForm] = useState({
        email: '', password: '', confirm: '',
        name: '', campus: '', division: '', role: '',
    });

    const updateField = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleNext = async () => {
        const currentKey = steps[step];
        const currentValue = form[currentKey];

        if (!currentValue.trim()) {
            return Alert.alert('입력 오류', '내용을 입력하세요.');
        }
        if (currentKey === 'confirm' && form.password !== form.confirm) {
            return Alert.alert('비밀번호 불일치', '비밀번호가 일치하지 않습니다.');
        }
        if (step === steps.length - 1) {
            const randomIndex = Math.floor(Math.random() * loadingAnimations.length);
            setLoadingAnimation(loadingAnimations[randomIndex]);
            setLoading(true); // ✅ 1. 로딩 상태 바로 반영 시도

            // ✅ 2. UI 렌더 우선 후 로직 실행
            requestAnimationFrame(() => {
                setTimeout(async () => {
                    try {
                        const { confirm, password, ...restForm } = form;

                        const hashedPassword = bcrypt.hashSync(password, 10); // 🔐 CPU 블로킹

                        const userData = {
                            ...restForm,
                            password: hashedPassword,
                            email: form.email,
                            createdAt: new Date(),
                        };

                        await setDoc(doc(db, 'users', form.email), userData);
                        await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
                        await reload();
                        await registerPushToken();

                        await reload();

                        // 🔒 최소 3초간 로딩 유지 후 홈 이동
                        setTimeout(() => {
                            setLoading(false);
                            router.replace('/');
                        }, 2000);
                    } catch (e: any) {
                        console.error('❌ 회원가입 실패:', e);
                        setLoading(false);
                        Alert.alert('회원가입 실패', e.message);
                    }
                }, 0); // 최소한의 delay
            });

            return;
        }

        Animated.timing(slideX, {
            toValue: -(step + 1) * SCREEN_WIDTH,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setStep(prev => prev + 1);
            const nextKey = steps[step + 1];
            setTimeout(() => inputRefs.current[nextKey]?.focus(), 100);
        });
    };

    const handleBack = () => {
        if (step === 0) {
            Animated.timing(slideX, {
                toValue: SCREEN_WIDTH,
                duration: 250,
                useNativeDriver: true,
            }).start(() => router.replace('/auth/login'));
            return;
        }
        const newStep = step - 1;
        Animated.timing(slideX, {
            toValue: -newStep * SCREEN_WIDTH,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setStep(newStep);
            const prevKey = steps[newStep];
            setTimeout(() => inputRefs.current[prevKey]?.focus(), 100);
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {step >= 0 && (
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
            )}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.slider}>
                    <Animated.View style={[styles.slideRow, { transform: [{ translateX: slideX }] }]}>
                        {/* 이메일 */}
                        <View style={styles.slide}>
                            <TextInput
                                ref={(ref) => { inputRefs.current['email'] = ref }}
                                style={styles.input}
                                placeholder="이메일"
                                placeholderTextColor="#666"
                                value={form.email}
                                onChangeText={text => updateField('email', text)}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        {/* 비밀번호 */}
                        <View style={styles.slide}>
                            <TextInput
                                ref={(ref) => { inputRefs.current['password'] = ref }}
                                style={styles.input}
                                placeholder="비밀번호"
                                placeholderTextColor="#666"
                                value={form.password}
                                onChangeText={(text) => updateField('password', text)}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoComplete="off"
                                textContentType="oneTimeCode"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
                                <Text style={{ color: '#2563eb' }}>
                                    {showPassword ? '🙈 숨기기' : '👁 보기'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* 비밀번호 확인 */}
                        <View style={styles.slide}>
                            <TextInput
                                ref={(ref) => { inputRefs.current['confirm'] = ref }}
                                style={styles.input}
                                placeholder="비밀번호 확인"
                                placeholderTextColor="#666"
                                value={form.confirm}
                                onChangeText={text => updateField('confirm', text)}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoComplete="off"
                                textContentType="oneTimeCode"
                            />
                            {form.confirm.length > 0 && form.confirm !== form.password && (
                                <Text style={{ color: 'red', marginTop: 4 }}>비밀번호가 일치하지 않습니다.</Text>
                            )}
                            {form.confirm.length > 0 && form.confirm === form.password && (
                                <Text style={{ color: 'green', marginTop: 4 }}>비밀번호가 일치합니다.</Text>
                            )}
                        </View>

                        {/* 이름 */}
                        <View style={styles.slide}>
                            <TextInput
                                ref={(ref) => { inputRefs.current['name'] = ref }}
                                style={styles.input}
                                placeholder="이름"
                                placeholderTextColor="#666"
                                value={form.name}
                                onChangeText={text => updateField('name', text)}
                            />
                            <Text style={{ marginTop: 8, fontSize: 13, color: 'red' }}>
                                ※ 가입 시 반드시 본명으로 해주세요. 익명일 경우 계정이 임의 삭제될 수 있습니다.
                            </Text>
                        </View>

                        {/* 캠퍼스 선택 */}
                        <View style={styles.slide}>
                            <Text style={styles.label}>캠퍼스를 선택하세요</Text>
                            <View style={styles.optionGroup}>
                                {campuses.map(campus => (
                                    <TouchableOpacity key={campus} onPress={() => updateField('campus', campus)} style={[styles.option, form.campus === campus && styles.optionSelected]}>
                                        <Text style={styles.optionText}>{campus}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* 소속 선택 */}
                        <View style={styles.slide}>
                            <Text style={styles.label}>소속을 선택하세요</Text>
                            <View style={styles.optionGroup}>
                                {divisions.map(d => (
                                    <TouchableOpacity key={d} onPress={() => updateField('division', d)} style={[styles.option, form.division === d && styles.optionSelected]}>
                                        <Text style={styles.optionText}>{d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* 역할 선택 */}
                        <View style={styles.slide}>
                            <Text style={styles.label}>역할을 선택하세요</Text>
                            <View style={styles.optionGroup}>
                                {roles.map(r => (
                                    <TouchableOpacity key={r} onPress={() => updateField('role', r)} style={[styles.option, form.role === r && styles.optionSelected]}>
                                        <Text style={styles.optionText}>{r}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                </View>

                <TouchableOpacity onPress={handleNext} style={styles.button} disabled={loading}>
                    {loading ? (
                        <Text style={styles.buttonText}>가입 중...</Text>
                    ) : (
                        <Text style={styles.buttonText}>
                            {step === steps.length - 1 ? '가입하기' : '다음'}
                        </Text>
                    )}
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
                        <Text style={{ color: '#fff', marginTop: 20, fontSize: 16 }}>가입 처리 중...</Text>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff'},
    slider: { flex: 1, overflow: 'hidden' },
    slideRow: { flexDirection: 'row' },
    slide: {
        width: SCREEN_WIDTH,
        paddingHorizontal: 24,
        paddingTop: 40,
        justifyContent: 'flex-start',
    },
    input: {
        borderBottomWidth: 1,
        borderColor: '#ccc',
        paddingVertical: 12,
        fontSize: 18,
        marginTop: 100,
        color: '#111',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 80,
    },
    optionGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    option: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginBottom: 8,
        marginRight: 8,
    },
    optionSelected: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    optionText: {
        color: '#111',
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        margin: 24,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 16,
        zIndex: 10,
        padding: 8,
    },
    backText: {
        fontSize: 28,
        color: '#2563eb',
        fontWeight: 'bold',
    },
});
