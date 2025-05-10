import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    SafeAreaView, Alert, KeyboardAvoidingView,
    Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';

export default function CreateTeam() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [leader, setLeader] = useState('');
    const [creatorEmail, setCreatorEmail] = useState('');
    const [role, setRole] = useState('');
    const [memberCount, setMemberCount] = useState('');
    const router = useRouter();

    const { colors, spacing, radius, font } = useDesign();

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
                // 🔥 소모임 생성 → teamRef 반환
                const teamRef = await addDoc(collection(db, 'teams'), {
                    ...baseData,
                    approved: false,
                });

                const newTeamId = teamRef.id; // ✅ 여기서 ID 추출

                const q = query(collection(db, 'users'), where('role', '==', '교역자'));
                const snapshot = await getDocs(q);

                const notified = new Set<string>();
                const firestorePromises: Promise<void>[] = [];
                const pushPromises: Promise<void>[] = [];

                snapshot.docs.forEach((docSnap) => {
                    const pastor = docSnap.data();

                    if (pastor.email === creatorEmail || notified.has(pastor.email)) return;
                    notified.add(pastor.email);

                    firestorePromises.push(sendNotification({
                        to: pastor.email,
                        message: `${leader}님이 "${name}" 소모임을 생성했습니다.`,
                        type: 'team_create',
                        link: '/pastor?tab=teams',
                        teamId: newTeamId, // ✅ 이제 정상적으로 전달됨
                        teamName: name,     // ✅ 이 값도 추가 추천
                    }));

                    if (pastor.expoPushToken) {
                        pushPromises.push(sendPushNotification({
                            to: pastor.expoPushToken,
                            title: '📌 소모임 승인 요청',
                            body: `${leader}님의 소모임 생성 승인 요청`,
                        }));
                    }
                });

                await Promise.all([...firestorePromises, ...pushPromises]);
            }

            router.replace('/teams');
        } catch (error: any) {
            Alert.alert('생성 실패', error.message);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
                    <Text style={{
                        fontSize: font.heading,
                        fontWeight: 'bold',
                        marginBottom: spacing.lg,
                        textAlign: 'center',
                        color: colors.text
                    }}>
                        📝 소모임 생성
                    </Text>

                    <TextInput
                        placeholder="모임명 (예: 러닝크루)"
                        placeholderTextColor={colors.placeholder}
                        value={name}
                        onChangeText={setName}
                        style={{
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            marginBottom: spacing.md,
                            color: colors.text,
                            fontSize: font.body,
                        }}
                    />

                    <TextInput
                        placeholder="모임 소개 (선택 사항)"
                        placeholderTextColor={colors.placeholder}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        style={{
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            marginBottom: spacing.md,
                            height: 120,
                            color: colors.text,
                            fontSize: font.body,
                            textAlignVertical: 'top',
                        }}
                    />

                    <TextInput
                        placeholder="최대 인원 수 (예: 5)"
                        keyboardType="numeric"
                        value={memberCount}
                        onChangeText={setMemberCount}
                        placeholderTextColor={colors.placeholder}
                        style={{
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            marginBottom: spacing.md,
                            color: colors.text,
                            fontSize: font.body,
                        }}
                    />

                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={{
                            backgroundColor: colors.primary,
                            paddingVertical: spacing.md,
                            borderRadius: radius.md,
                            alignItems: 'center',
                            marginTop: spacing.sm,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>소모임 생성</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
