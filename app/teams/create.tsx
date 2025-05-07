// app/teams/create.tsx
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase/config';

export default function CreateTeam() {
    const [name, setName] = useState('');
    const [leader, setLeader] = useState('');
    const [description, setDescription] = useState('');
    const router = useRouter();

    const handleSubmit = async () => {
        if (!name || !leader) {
            Alert.alert('입력 오류', '모임명과 모임장 이름은 필수입니다.');
            return;
        }

        try {
            await addDoc(collection(db, 'teams'), {
                name,
                leader,
                description,
                members: 1,
                createdAt: new Date(),
            });
            Alert.alert('✅ 소모임이 생성되었습니다!');
            router.back();
        } catch (error: any) {
            Alert.alert('생성 실패', error.message);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.title}>📝 소모임 생성</Text>

                    <TextInput
                        placeholder="모임명 (예: 러닝크루)"
                        placeholderTextColor="#aaa"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="모임장 이름 (예: 홍길동)"
                        placeholderTextColor="#aaa"
                        value={leader}
                        onChangeText={setLeader}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="모임 소개 (선택 사항)"
                        placeholderTextColor="#aaa"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        style={[styles.input, styles.textArea]}
                    />

                    <TouchableOpacity onPress={handleSubmit} style={styles.button}>
                        <Text style={styles.buttonText}>소모임 생성</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    container: {
        padding: 24,
        flexGrow: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 28,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 16,
        fontSize: 16,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#3b82f6',
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
