import React, { useEffect, useState } from 'react';
import {
    View, Text, SafeAreaView, TouchableOpacity, Alert, Image,
    ActivityIndicator, ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, query, collection, where, getDocs, updateDoc, increment, arrayRemove } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';

type Team = {
    id: string;
    name: string;
    leader: string;
    leaderEmail: string;
    members: number;
    capacity: number;
    membersList: string[];
    [key: string]: any; // 기타 필드를 허용하는 경우
};

export default function TeamDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [memberUsers, setMemberUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    const { colors, font, spacing, radius } = useDesign();
    const { mode } = useAppTheme();

    const isCreator = team?.leaderEmail === user?.email;

    useEffect(() => {
        const fetch = async () => {
            const docSnap = await getDoc(doc(db, 'teams', id));
            if (!docSnap.exists()) return;

            const teamData = { id: docSnap.id, ...docSnap.data() } as Team;
            setTeam(teamData);

            const currentUser = await getCurrentUser();
            setUser(currentUser);

            const emails = Array.from(new Set(teamData.membersList || []));
            if (emails.length > 0) {
                const batches = [];
                const cloned = [...emails];
                while (cloned.length) {
                    const batch = cloned.splice(0, 10);
                    batches.push(query(collection(db, 'users'), where('email', 'in', batch)));
                }
                const results = await Promise.all(batches.map(q => getDocs(q)));
                const users = results.flatMap(snap => snap.docs.map(doc => doc.data()));
                setMemberUsers(users);
            }

            setLoading(false);
        };
        fetch();
    }, []);

    const handleJoin = async () => {
        if (!team || !user) return;

        if (team.membersList?.includes(user.email)) {
            Alert.alert('참여 불가', '이미 가입된 모임입니다.');
            return;
        }

        if ((team.members ?? 0) >= (team.maxMembers ?? 99)) {
            Alert.alert('인원 초과', '모집이 마감되었습니다.');
            return;
        }

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

        const q = query(collection(db, 'expoTokens'), where('email', '==', team.leaderEmail));
        const snap = await getDocs(q);
        const tokens: string[] = snap.docs.map(doc => doc.data().token).filter(Boolean);

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

    const handleKick = async (email: string) => {
        if (!team) return;

        // ✅ 이메일에 해당하는 사용자 이름 찾기
        const member = memberUsers.find(m => m.email === email);
        const displayName = member?.name || email;

        Alert.alert('정말 강퇴하시겠습니까?', displayName, [
            { text: '취소', style: 'cancel' },
            {
                text: '강퇴', style: 'destructive', onPress: async () => {
                    try {
                        const teamRef = doc(db, 'teams', team.id);
                        await updateDoc(teamRef, {
                            membersList: arrayRemove(email),
                            members: increment(-1),
                        });

                        const updatedSnap = await getDoc(teamRef);
                        if (updatedSnap.exists()) {
                            const updatedData = updatedSnap.data();
                            setTeam({
                                id: updatedSnap.id,
                                name: updatedData.name,
                                leader: updatedData.leader,
                                leaderEmail: updatedData.leaderEmail,
                                members: updatedData.members,
                                capacity: updatedData.capacity,
                                membersList: updatedData.membersList,
                                ...updatedData, // 기타 필드
                            });
                        }

                        setMemberUsers(prev => prev.filter(m => m.email !== email));
                        Alert.alert('강퇴 완료', `${displayName}님이 강퇴되었습니다.`);
                    } catch (e) {
                        console.error('❌ 강퇴 실패:', e);
                        Alert.alert('에러', '강퇴에 실패했습니다.');
                    }
                }
            }
        ]);
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

    const isFull = (team?.members ?? 0) >= (team?.capacity ?? 99);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
                {team.thumbnail && (
                    <Image
                        source={{ uri: team.thumbnail }}
                        style={{ width: '100%', height: 180, borderRadius: radius.lg, backgroundColor: colors.border }}
                    />
                )}

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
                    <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>{team.name}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: spacing.sm }}>by {team.leader}</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                        <Text style={{ fontSize: font.caption, color: colors.text }}>📍 {team.location || '온라인'}</Text>
                        <Text style={{ fontSize: font.caption, color: colors.text }}>📅 {team.schedule || '협의 후 결정'}</Text>
                    </View>

                    {/* ✅ 인원수: membersList 기준 */}
                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>
                        👥 {team.membersList?.length ?? 0} / {team.maxMembers ?? '명'}
                    </Text>
                </View>

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
                    <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>모임 소개</Text>
                    <Text style={{ fontSize: font.body, color: colors.text, lineHeight: 22 }}>{team.description}</Text>
                </View>

                {memberUsers.length > 0 && (
                    <View style={{
                        backgroundColor: colors.surface,
                        borderRadius: radius.lg,
                        padding: spacing.lg
                    }}>
                        <Text style={{
                            fontSize: font.body,
                            fontWeight: '600',
                            color: colors.text,
                            marginBottom: spacing.sm
                        }}>
                            🙋 현재 참여자
                        </Text>

                        {[...memberUsers]
                            .sort((a, b) => (a.email === team.leaderEmail ? -1 : 1))
                            .map((member) => (
                                <View
                                    key={member.email}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 10,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: member.email === team.leaderEmail ? colors.primary : colors.text,
                                            fontWeight: member.email === team.leaderEmail ? 'bold' : 'normal',
                                        }}
                                    >
                                        {member.email === team.leaderEmail && '👑 '}
                                        {member.name}
                                    </Text>

                                    {isCreator && member.email !== user.email && (
                                        <TouchableOpacity onPress={() => handleKick(member.email)}>
                                            <Text style={{ color: colors.error }}>강퇴</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                    </View>
                )}

                {!isFull && !isCreator && (
                    <TouchableOpacity
                        onPress={handleJoin}
                        disabled={isFull}
                        style={{ backgroundColor: isFull ? colors.border : colors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm }}
                    >
                        <Text style={{ color: '#fff', fontSize: font.body, fontWeight: '600' }}>{isFull ? '모집마감' : '가입 신청하기'}</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
