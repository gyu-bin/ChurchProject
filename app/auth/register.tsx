// RegisterSlideScreen.tsx 전체 수정본
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Animated,
    Dimensions,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { db } from '@/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { registerPushToken } from '@/services/registerPushToken';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;

const campuses = ['문래', '신촌'];
const divisions = ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'];
const roles = ['성도', '교역자'];

export default function RegisterSlideScreen() {
    const router = useRouter();
    const slideX = useRef(new Animated.Value(0)).current;
    const [step, setStep] = useState(0);
    const inputRefs = useRef<Record<string, TextInput | null>>({});

    const steps = ['email', 'password', 'confirm', 'name', 'campus', 'division', 'role'] as const;

    const [form, setForm] = useState({
        email: '',
        password: '',
        confirm: '',
        name: '',
        campus: '',
        division: '',
        role: '성도',
    });

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
            try {
                const userData = { ...form, createdAt: new Date() };
                await setDoc(doc(db, 'users', form.email), userData);
                await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
                await registerPushToken();
                Alert.alert('가입 완료', '환영합니다!');
                setTimeout(() => router.replace('/'), 300);
            } catch (e: any) {
                Alert.alert('회원가입 실패', e.message);
            }
            return;
        }

        Animated.timing(slideX, {
            toValue: -(step + 1) * SCREEN_WIDTH,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setStep((prev) => prev + 1);
            const nextKey = steps[step + 1];
            setTimeout(() => inputRefs.current[nextKey]?.focus(), 100);
        });
    };

    const updateField = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
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
                        {/* email */}
                        <View style={styles.slide}>
                            <TextInput
                                ref={(ref) => { inputRefs.current['email'] = ref }}
                                style={styles.input}
                                placeholder="이메일"
                                placeholderTextColor="#666"
                                value={form.email}
                                onChangeText={(text) => updateField('email', text)}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        {/* password */}
                        <View style={styles.slide}>
                            <TextInput
                                ref={(ref) => { inputRefs.current['password'] = ref }}
                                style={styles.input}
                                placeholder="비밀번호"
                                placeholderTextColor="#666"
                                // secureTextEntry
                                value={form.password}
                                onChangeText={(text) => updateField('password', text)}
                                textContentType="none"
                                autoComplete="off"
                                importantForAutofill="no"
                                autoCorrect={false}
                                spellCheck={false}
                            />
                        </View>

                        {/* confirm password */}
                        <View style={styles.slide}>
                            <TextInput
                                ref={(ref) => { inputRefs.current['confirm'] = ref }}
                                style={styles.input}
                                placeholder="비밀번호 확인"
                                placeholderTextColor="#666"
                                value={form.confirm}
                                onChangeText={(text) => updateField('confirm', text)}
                                textContentType="none"
                                autoComplete="off"
                                importantForAutofill="no"
                                autoCorrect={false}
                                spellCheck={false}
                            />
                            {form.confirm.length > 0 && form.confirm !== form.password && (
                                <Text style={{ color: 'red', marginTop: 4 }}>비밀번호가 일치하지 않습니다.</Text>
                            )}
                            {form.confirm.length > 0 && form.confirm === form.password && (
                                <Text style={{ color: 'green', marginTop: 4 }}>비밀번호가 일치합니다.</Text>
                            )}
                        </View>

                        {/* name */}
                        <View style={styles.slide}>
                            <TextInput
                                ref={(ref) => { inputRefs.current['name'] = ref }}
                                style={styles.input}
                                placeholder="이름"
                                placeholderTextColor="#666"
                                value={form.name}
                                onChangeText={(text) => updateField('name', text)}
                            />
                        </View>

                        {/* campus */}
                        <View style={styles.slide}>
                            <Text style={styles.label}>캠퍼스를 선택하세요</Text>
                            <View style={styles.optionGroup}>
                                {campuses.map((campus) => (
                                    <TouchableOpacity
                                        key={campus}
                                        onPress={() => updateField('campus', campus)}
                                        style={[styles.option, form.campus === campus && styles.optionSelected]}
                                    >
                                        <Text style={styles.optionText}>{campus}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* division */}
                        <View style={styles.slide}>
                            <Text style={styles.label}>소속을 선택하세요</Text>
                            <View style={styles.optionGroup}>
                                {divisions.map((d) => (
                                    <TouchableOpacity
                                        key={d}
                                        onPress={() => updateField('division', d)}
                                        style={[styles.option, form.division === d && styles.optionSelected]}
                                    >
                                        <Text style={styles.optionText}>{d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* role */}
                        <View style={styles.slide}>
                            <Text style={styles.label}>역할을 선택하세요</Text>
                            <View style={styles.optionGroup}>
                                {roles.map((r) => (
                                    <TouchableOpacity
                                        key={r}
                                        onPress={() => updateField('role', r)}
                                        style={[styles.option, form.role === r && styles.optionSelected]}
                                    >
                                        <Text style={styles.optionText}>{r}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                </View>

                <TouchableOpacity onPress={handleNext} style={styles.button}>
                    <Text style={styles.buttonText}>{step === steps.length - 1 ? '가입하기' : '다음'}</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    slider: { flex: 1, overflow: 'hidden' },
    slideRow: { flexDirection: 'row', width: SCREEN_WIDTH * 7 },
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
