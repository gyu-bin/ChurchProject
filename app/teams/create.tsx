import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendNotification, sendPushNotification } from '@/services/notificationService';

export default function CreateTeam() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [leader, setLeader] = useState('');
    const [creatorEmail, setCreatorEmail] = useState('');
    const router = useRouter();
    const [role, setRole] = useState('');
    const [memberCount, setMemberCount] = useState('');

    useEffect(() => {
        AsyncStorage.getItem('currentUser').then((raw) => {
            if (raw) {
                const user = JSON.parse(raw);
                setLeader(user.name);
                setCreatorEmail(user.email);
                setRole(user.role);
            }
        });
    }, []);

    const handleSubmit = async () => {
        if (!name) {
            Alert.alert('입력 오류', '모임명을 입력해주세요.');
            return;
        }

        try {
            const baseData = {
                name,
                leader,
                leaderEmail: creatorEmail,
                description,
                members: 1,
                membersList: [creatorEmail],
                createdAt: new Date(),
                maxMembers: parseInt(memberCount) || 10,
            };

            if (role === '교역자') {
                await addDoc(collection(db, 'teams'), {
                    ...baseData,
                    approved: true,
                });
            } else {
                await addDoc(collection(db, 'teams'), {
                    ...baseData,
                    approved: false,
                });

                const q = query(collection(db, 'users'), where('role', '==', '교역자'));
                const snapshot = await getDocs(q);
                snapshot.docs.forEach(async (docSnap) => {
                    const pastor = docSnap.data();

                    await sendNotification({
                        to: pastor.email,
                        text: `${leader}님이 "${name}" 소모임을 생성했습니다.`,
                        link: '/pastor?tab=teams',
                    });

                    if (pastor.expoPushToken) {
                        await sendPushNotification({
                            to: pastor.expoPushToken,
                            title: '📌 소모임 승인 요청',
                            body: `${leader}님의 소모임 승인 요청`,
                        });
                    }
                });
            }

            router.replace('/teams');
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
                        placeholder="모임 소개 (선택 사항)"
                        placeholderTextColor="#aaa"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        style={[styles.input, styles.textArea]}
                    />

                    <TextInput
                        placeholder="최대 인원 수 (예: 5)"
                        keyboardType="numeric"
                        value={memberCount}
                        onChangeText={setMemberCount}
                        style={styles.input}
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
    safeArea: { flex: 1, backgroundColor: '#f9fafb' },
    container: { padding: 24, flexGrow: 1 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 28, textAlign: 'center' },
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
