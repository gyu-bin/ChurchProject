// ✅ TeamDetail 전체 UI 개선: 썸네일, 카테고리, 모임 시간, 위치, 참여자 일부, 일정, 설명 등 추가

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { sendNotification, sendPushNotification } from '@/services/notificationService';

export default function TeamDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
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

    const handleJoin = async () => {
        if (!team || !user) return;
        if (team.membersList?.includes(user.email)) {
            Alert.alert('참여 불가', '이미 가입된 모임입니다.');
            return;
        }
        if ((team.members ?? 0) >= (team.capacity ?? 99)) {
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
        if (team.leaderPushToken) {
            await sendPushNotification({
                to: team.leaderPushToken,
                title: '🙋 소모임 가입 신청',
                body: `${user.name}님의 신청`,
            });
        }
        Alert.alert('가입 신청 완료', '모임장에게 신청 메시지를 보냈습니다.');
        router.back();
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" />
            </SafeAreaView>
        );
    }

    if (!team) {
        return (
            <SafeAreaView style={styles.center}>
                <Text>모임을 찾을 수 없습니다.</Text>
            </SafeAreaView>
        );
    }

    const isFull = team.members >= team.capacity;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* 썸네일 */}
                {team.thumbnail && (
                    <Image source={{ uri: team.thumbnail }} style={styles.thumbnail} />
                )}

                {/* 상단 정보 카드 */}
                <View style={styles.card}>
                    <Text style={styles.title}>{team.name}</Text>
                    <Text style={styles.sub}>by {team.leader}</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoItem}>📍 {team.location || '온라인'}</Text>
                        <Text style={styles.infoItem}>📅 {team.schedule || '협의 후 결정'}</Text>
                    </View>
                    <Text style={styles.meta}>
                        👥 {team.members ?? 0} / {team.maxMembers ?? '명'}
                    </Text>
                </View>

                {/* 설명 */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>모임 소개</Text>
                    <Text style={styles.description}>{team.description}</Text>
                </View>

                {/* 참여자 */}
                {team.sampleMembers?.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>🙋 참여자 일부</Text>
                        <Text style={styles.participants}>{team.sampleMembers.join(', ')}</Text>
                    </View>
                )}

                {/* 버튼 */}
                {!isFull && !isCreator && (
                    <TouchableOpacity
                        onPress={handleJoin}
                        style={[styles.button, isFull && styles.buttonDisabled]}
                        disabled={isFull}
                    >
                        <Text style={styles.buttonText}>{isFull ? '모집마감' : '가입 신청하기'}</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fb',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: {
        padding: 24,
        gap: 20,
    },
    thumbnail: {
        width: '100%',
        height: 180,
        borderRadius: 14,
        backgroundColor: '#dbeafe',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginBottom: 4,
    },
    sub: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    infoItem: {
        fontSize: 14,
        color: '#475569',
    },
    meta: {
        fontSize: 14,
        color: '#475569',
        marginTop: 6,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e3a8a',
        marginBottom: 8,
    },
    description: {
        fontSize: 15,
        color: '#334155',
        lineHeight: 22,
    },
    participants: {
        fontSize: 14,
        color: '#1e40af',
    },
    button: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonDisabled: {
        backgroundColor: '#9ca3af',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
