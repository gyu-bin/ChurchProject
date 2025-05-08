import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, increment, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { sendNotification } from '@/services/notificationService';

export default function TeamDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

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

        const currentMembers = team.members ?? 1;
        const capacity = team.capacity ?? 1;

        if (currentMembers >= capacity) {
            Alert.alert('인원 초과', '모집이 마감되었습니다.');
            return;
        }

        // 1. 인원 수 증가
        await updateDoc(doc(db, 'teams', id), {
            members: increment(1),
        });

        // 2. 팀장에게 알림 전송
        const q = query(collection(db, 'users'), where('name', '==', team.leader));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            const leaderEmail = doc.data().email;
            sendNotification(leaderEmail, `${user.name}님이 ${team.name} 소모임에 가입을 신청했습니다.`);
        });

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
            <Text style={styles.title}>{team.name}</Text>
            <Text style={styles.leader}>👤 모임장: {team.leader}</Text>
            <Text style={styles.description}>{team.description}</Text>
            <Text style={styles.meta}>👥 인원: {team.members ?? 1} / {team.capacity ?? 1}</Text>

            <TouchableOpacity
                onPress={handleJoin}
                style={[styles.button, isFull && styles.buttonDisabled]}
                disabled={isFull}
            >
                <Text style={styles.buttonText}>{isFull ? '모집마감' : '가입 신청하기'}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    leader: { fontSize: 16, marginBottom: 4 },
    description: { fontSize: 16, marginVertical: 12 },
    meta: { fontSize: 16, color: '#555', marginBottom: 20 },
    button: {
        backgroundColor: '#2563eb',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#9ca3af',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
