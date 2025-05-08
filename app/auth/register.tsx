// app/auth/register.tsx
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { db } from '@/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import uuid from 'react-native-uuid';
import { useRouter } from 'expo-router';

const campuses = ['문래', '신촌'];
const divisions = ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'];
const roles = ['성도', '교역자'];

export default function RegisterScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [campus, setCampus] = useState('');
    const [division, setDivision] = useState('');
    const [role, setRole] = useState<'성도' | '교역자'>('성도');

    const handleRegister = async () => {
        if (!email || !password || !name || !campus || !division || !role) {
            return Alert.alert('입력 오류', '모든 필드를 입력하세요.');
        }

        const userId = uuid.v4().toString();

        await setDoc(doc(db, 'users', email), {
            email,
            password,
            name,
            campus,
            division,
            role, // ✅ 성도/교역자 저장
            createdAt: new Date(),
        });

        Alert.alert('가입 완료', '이제 로그인해 주세요.');
        router.replace('/auth/login');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>회원가입</Text>
            <TextInput placeholder="이메일" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" />
            <TextInput placeholder="비밀번호" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
            <TextInput placeholder="이름" value={name} onChangeText={setName} style={styles.input} />

            <Text style={styles.label}>캠퍼스</Text>
            <View style={styles.buttonGroup}>
                {campuses.map((c) => (
                    <TouchableOpacity
                        key={c}
                        onPress={() => setCampus(c)}
                        style={[styles.optionButton, campus === c && styles.optionButtonSelected]}
                    >
                        <Text style={styles.optionText}>{c}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>소속</Text>
            <View style={styles.buttonGroup}>
                {divisions.map((d) => (
                    <TouchableOpacity
                        key={d}
                        onPress={() => setDivision(d)}
                        style={[styles.optionButton, division === d && styles.optionButtonSelected]}
                    >
                        <Text style={styles.optionText}>{d}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>역할</Text>
            <View style={styles.buttonGroup}>
                {roles.map((r) => (
                    <TouchableOpacity
                        key={r}
                        onPress={() => setRole(r as '성도' | '교역자')}
                        style={[styles.optionButton, role === r && styles.optionButtonSelected]}
                    >
                        <Text style={styles.optionText}>{r}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity onPress={handleRegister} style={styles.button}>
                <Text style={styles.buttonText}>가입하기</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16 },
    button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    label: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 6 },
    buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionButton: {
        borderWidth: 1, borderColor: '#ccc', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8,
    },
    optionButtonSelected: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    optionText: {
        color: '#000',
        fontWeight: '500',
    },
});
