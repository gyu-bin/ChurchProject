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
import {Ionicons} from "@expo/vector-icons";
import {useSafeAreaInsets} from "react-native-safe-area-context";
// import { useAppTheme } from '@/context/ThemeContext';

export default function CreateTeam() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [leader, setLeader] = useState('');
    const [creatorEmail, setCreatorEmail] = useState('');
    const [role, setRole] = useState('');
    const [memberCount, setMemberCount] = useState('');
    const router = useRouter();
    const insets = useSafeAreaInsets();
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

        // 🔒 생성 권한 제한
        if (role === '새가족') {
            Alert.alert('권한 부족', '정회원 또는 교역자만 소모임을 생성할 수 있습니다.');
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

            if (role === '교역자' || role === '정회원') {
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

                    /*firestorePromises.push(sendNotification({
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
                    }*/
                });

                await Promise.all([...firestorePromises, ...pushPromises]);
            }
            
            Alert.alert('완료', '모임이 성공적으로 생성되었습니다.');
            router.replace('/teams');
        } catch (error: any) {
            Alert.alert('생성 실패', error.message);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background,paddingTop: Platform.OS === 'android' ? 30 : 0 }}>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.lg,
                    marginTop: Platform.OS === 'android' ? insets.top : spacing.md,
                }}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text, marginLeft: 8 }}>
                    소모임 목록
                </Text>
            </View>
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

                    <Text style={{
                        fontSize: 12,
                        color: colors.subtext,
                        textAlign: 'center',
                        marginTop: spacing.lg,
                        lineHeight: 20,
                    }}>
                        ※ 소모임은 정회원 또는 교역자만 생성할 수 있습니다.{'\n'}
                        ※ 모임장은 정회원 이상이어야 하며, 최소 5명 이상이 모여야 합니다.{'\n'}
                        ※ 생성 후 1개월 내 인원이 없을 경우 모임이 삭제될 수 있습니다.{'\n'}
                        ※ 교회와 무관한 주제의 모임은 임의로 삭제될 수 있습니다.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
