// ✅ Firebase Auth 기반 회원가입 + Firestore 사용자 정보 저장 + 비밀번호 보기 토글 (슬라이드 → 그룹화 UI 개편)

import { db } from '@/firebase/config';
import { registerPushToken } from '@/services/registerPushToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from "bcryptjs";
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import React, { useRef, useState } from 'react';
import {
    Alert, Animated, Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';

import loading4 from '@/assets/lottie/Animation - 1747201330128.json';
import loading3 from '@/assets/lottie/Animation - 1747201413764.json';
import loading2 from '@/assets/lottie/Animation - 1747201431992.json';
import loading1 from '@/assets/lottie/Animation - 1747201461030.json';
import { useAuth } from "@/hooks/useAuth";
import {useSafeAreaFrame} from "react-native-safe-area-context";


const campuses = ['문래', '신촌', '시선교회'];
const divisions = ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'];
const roles = [ '정회원','교역자','관리자'];

export default function RegisterSlideScreen() {
    const router = useRouter();
    const slideX = useRef(new Animated.Value(0)).current;
    const inputRefs = useRef<Record<string, TextInput | null>>({});
    const [step, setStep] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingAnimation, setLoadingAnimation] = useState<any>(null);
    const loadingAnimations = [loading1, loading2, loading3, loading4];
    const { reload , login} = useAuth();
    const frame = useSafeAreaFrame();
    const steps = ['email_name', 'password_confirm', 'info'] as const;
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    bcrypt.setRandomFallback((len: number) => {
        const result = [];
        for (let i = 0; i < len; i++) {
            result.push(Math.floor(Math.random() * 256));
        }
        return result;
    });

    const [form, setForm] = useState({
        email: '', password: '', confirm: '', name: '', campus: '', division: '', role: '',
    });

    const updateField = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    // ✅ 스텝별 유효성 검사
    const validateStep = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (step === 0) {
            // 이메일
            if (!form.email) {
                newErrors.email = '이메일을 입력하세요.';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                newErrors.email = '유효한 이메일 형식이 아닙니다.';
            }

            // 이름
            if (!form.name.trim()) {
                newErrors.name = '이름을 입력하세요.';
            } else if (form.name.trim().length < 2) {
                newErrors.name = '이름은 최소 2자 이상이어야 합니다.';
            }
        }

        if (step === 1) {
            // 비밀번호
            if (!form.password) {
                newErrors.password = '비밀번호를 입력하세요.';
            } else if (
                form.password.length < 8 ||
                !/[A-Z]/.test(form.password) ||
                !/[a-z]/.test(form.password) ||
                !/[0-9]/.test(form.password) ||
                !/[!@#$%^&*]/.test(form.password)
            ) {
                newErrors.password = '비밀번호는 8자 이상, 대소문자, 숫자, 특수문자를 포함해야 합니다.';
            }

            // 비밀번호 확인
            if (form.password !== form.confirm) {
                newErrors.confirm = '비밀번호가 일치하지 않습니다.';
            }
        }

        if (step === 2) {
            if (!form.campus) newErrors.campus = '캠퍼스를 선택하세요.';
            if (!form.division) newErrors.division = '소속을 선택하세요.';
            if (!form.role) newErrors.role = '역할을 선택하세요.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = async () => {
        if (!validateStep()) return;

        if (step === steps.length - 1) {
            const randomIndex = Math.floor(Math.random() * loadingAnimations.length);
            setLoadingAnimation(loadingAnimations[randomIndex]);
            setLoading(true);
            requestAnimationFrame(() => {
                setTimeout(async () => {
                    try {
                        const { confirm, password, ...restForm } = form;
                        const hashedPassword = bcrypt.hashSync(password, 10);
                        const userData = { ...restForm, password: hashedPassword, email: form.email, createdAt: new Date() };

                        await setDoc(doc(db, 'users', form.email), userData);
                        await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
                        await AsyncStorage.setItem('isLoggedIn', 'true');
                        await registerPushToken();
                        await reload();

                        setTimeout(() => {
                            setLoading(false);
                            router.replace('/home');
                        }, 2000);
                    } catch (e: any) {
                        console.error('❌ 회원가입 실패:', e);
                        setLoading(false);
                        Alert.alert('회원가입 실패', e.message);
                    }
                }, 0);
            });
            return;
        }

        Animated.timing(slideX, {
            toValue: -(step + 1) * frame.width,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setStep(prev => prev + 1));
    };

    const handleBack = () => {
        if (step === 0) {
            Animated.timing(slideX, {
                toValue: frame.width,
                duration: 250,
                useNativeDriver: true,
            }).start(() => router.replace('/auth/login'));
            return;
        }
        const newStep = step - 1;
        Animated.timing(slideX, {
            toValue: -newStep * frame.width,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setStep(newStep));
    };

    return (
        <SafeAreaView style={styles.container}>
            {step >= 0 && <TouchableOpacity style={styles.backButton} onPress={handleBack}><Text style={styles.backText}>←</Text></TouchableOpacity>}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.slider}>
                    <Animated.View style={[styles.slideRow, { transform: [{ translateX: slideX }] }]}>
                        {/* 1. 이메일 + 이름 */}
                        <View style={[styles.slide, { width: frame.width}]}>
                            <TextInput style={styles.input} placeholder="이메일" placeholderTextColor="#666" value={form.email} onChangeText={text => updateField('email', text)} autoCapitalize="none" keyboardType="email-address" />
                            <TextInput style={[styles.input, { marginTop: 40 }]} placeholder="이름" placeholderTextColor="#666" value={form.name} onChangeText={text => updateField('name', text)} />
                            <Text style={{ marginTop: 8, fontSize: 13, color: 'red' }}>※ 가입 시 반드시 본명으로 해주세요.</Text>
                        </View>

                        {/* 2. 비밀번호 + 확인 */}
                        <View style={[styles.slide, { width: frame.width}]}>
                            <TextInput style={styles.input} placeholder="비밀번호" placeholderTextColor="#666" value={form.password} onChangeText={(text) => updateField('password', text)} secureTextEntry={!showPassword} autoCapitalize="none" textContentType="oneTimeCode" />
                            <TextInput style={[styles.input, { marginTop: 40 }]} placeholder="비밀번호 확인" placeholderTextColor="#666" value={form.confirm} onChangeText={(text) => updateField('confirm', text)} secureTextEntry={!showPassword} autoCapitalize="none" textContentType="oneTimeCode" />
                            <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}><Text style={{ color: '#2563eb', marginTop: 10 }}>{showPassword ? '🙈 숨기기' : '👁 보기'}</Text></TouchableOpacity>
                            {form.confirm.length > 0 && form.confirm !== form.password && <Text style={{ color: 'red' }}>비밀번호가 일치하지 않습니다.</Text>}
                            {form.confirm.length > 0 && form.confirm === form.password && <Text style={{ color: 'green' }}>비밀번호가 일치합니다.</Text>}
                        </View>

                        {/* 3. 캠퍼스 + 소속 + 역할 */}
                        <View style={[styles.slide, { width: frame.width}]}>
                            <Text style={styles.label}>캠퍼스 선택</Text>
                            <View style={styles.optionGroup}>{campuses.map(campus => (<TouchableOpacity key={campus} onPress={() => updateField('campus', campus)} style={[styles.option, form.campus === campus && styles.optionSelected]}><Text style={styles.optionText}>{campus}</Text></TouchableOpacity>))}</View>
                            <Text style={styles.label}>소속 선택</Text>
                            <View style={styles.optionGroup}>{divisions.map(d => (<TouchableOpacity key={d} onPress={() => updateField('division', d)} style={[styles.option, form.division === d && styles.optionSelected]}><Text style={styles.optionText}>{d}</Text></TouchableOpacity>))}</View>
                            <Text style={styles.label}>역할 선택</Text>
                            <View style={styles.optionGroup}>{roles.map(r => (<TouchableOpacity key={r} onPress={() => updateField('role', r)} style={[styles.option, form.role === r && styles.optionSelected]}><Text style={styles.optionText}>{r}</Text></TouchableOpacity>))}</View>
                        </View>
                    </Animated.View>
                </View>

                <TouchableOpacity onPress={handleNext} style={styles.button} disabled={loading}>
                    <Text style={styles.buttonText}>{loading ? '가입 중...' : (step === steps.length - 1 ? '가입하기' : '다음')}</Text>
                </TouchableOpacity>

                <Modal visible={loading} transparent animationType="fade">
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                        {loadingAnimation && <LottieView source={loadingAnimation} autoPlay loop style={{ width: 400, height: 400 }} />}
                        <Text style={{ color: '#fff', marginTop: 20, fontSize: 16 }}>가입 처리 중...</Text>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    slider: { flex: 1, overflow: 'hidden' },
    slideRow: { flexDirection: 'row' },
    slide: { paddingHorizontal: 24, paddingTop: 40, justifyContent: 'flex-start' },
    input: { borderBottomWidth: 1, borderColor: '#ccc', paddingVertical: 12, fontSize: 18, marginTop: 100, color: '#111' },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 40 },
    optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    option: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8, marginRight: 8 },
    optionSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    optionText: { color: '#111', fontWeight: '500' },
    button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', margin: 24 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    backButton: { position: 'absolute', top: 50, left: 16, zIndex: 10, padding: 8 },
    backText: { fontSize: 28, color: '#2563eb', fontWeight: 'bold' },
});
