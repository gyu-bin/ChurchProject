import React, { useEffect, useState } from 'react';
import {
    View, Text, SafeAreaView, TouchableOpacity, Alert, Image,
    ActivityIndicator, ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, query,  collection, where, getDocs} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';

export default function TeamDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    const { colors, font, spacing, radius } = useDesign();
    const { mode } = useAppTheme();

    const isCreator = team?.leaderEmail === user?.email;

    useEffect(() => {
        const fetch = async () => {
            const docSnap = await getDoc(doc(db, 'teams', id));
            if (docSnap.exists()) setTeam({ id: docSnap.id, ...docSnap.data() });
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            setLoading(false);
        };
        fetch();
    }, []);
    /* if (team.membersList?.includes(user.email)) {
               Alert.alert('참여 불가', '이미 가입된 모임입니다.');
               return;
           }*/

    const handleJoin = async () => {
        if (!team || !user) return;

        if ((team.members ?? 0) >= (team.capacity ?? 99)) {
            Alert.alert('인원 초과', '모집이 마감되었습니다.');
            return;
        }

        // 1. Firestore 알림 등록
        await sendNotification({
            to: team.leaderEmail,
            message: `${user.name}님이 "${team.name}" 모임에 가입 신청했습니다.`,
            type: 'team_join_request',
            link: '/notifications',
            teamId: team.id,
            teamName: team.name,
            applicantEmail: user.email,
            applicantName: user.name,
        });

        // 2. leaderEmail 기준 expoTokens에서 푸시 토큰 조회
        const q = query(collection(db, 'expoTokens'), where('email', '==', team.leaderEmail));
        const snap = await getDocs(q);

        const tokens: string[] = [];
        snap.forEach(doc => {
            const token = doc.data().token;
            if (token) tokens.push(token);
        });

        // 3. 푸시 알림 전송 (중복 제거된 토큰)
        if (tokens.length > 0) {
            await sendPushNotification({
                to: tokens,
                title: '🙋 소모임 가입 신청',
                body: `${user.name}님의 신청`,
            });
        }

        Alert.alert('가입 신청 완료', '모임장에게 신청 메시지를 보냈습니다.');
        router.back();
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (!team) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <Text style={{ color: colors.text }}>모임을 찾을 수 없습니다.</Text>
            </SafeAreaView>
        );
    }

    const isFull = team.members >= team.capacity;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
                {team.thumbnail && (
                    <Image
                        source={{ uri: team.thumbnail }}
                        style={{
                            width: '100%',
                            height: 180,
                            borderRadius: radius.lg,
                            backgroundColor: colors.border
                        }}
                    />
                )}

                <View style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 3
                }}>
                    <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>{team.name}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: spacing.sm }}>by {team.leader}</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                        <Text style={{ fontSize: font.caption, color: colors.text }}>📍 {team.location || '온라인'}</Text>
                        <Text style={{ fontSize: font.caption, color: colors.text }}>📅 {team.schedule || '협의 후 결정'}</Text>
                    </View>
                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>
                        👥 {team.members ?? 0} / {team.maxMembers ?? '명'}
                    </Text>
                </View>

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
                    <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>모임 소개</Text>
                    <Text style={{ fontSize: font.body, color: colors.text, lineHeight: 22 }}>{team.description}</Text>
                </View>

                {team.sampleMembers?.length > 0 && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
                        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>🙋 참여자 일부</Text>
                        <Text style={{ fontSize: font.caption, color: colors.primary }}>{team.sampleMembers.join(', ')}</Text>
                    </View>
                )}

                {!isFull && !isCreator && (
                    <TouchableOpacity
                        onPress={handleJoin}
                        disabled={isFull}
                        style={{
                            backgroundColor: isFull ? colors.border : colors.primary,
                            paddingVertical: spacing.md,
                            borderRadius: radius.md,
                            alignItems: 'center',
                            marginTop: spacing.sm
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: font.body, fontWeight: '600' }}>
                            {isFull ? '모집마감' : '가입 신청하기'}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
