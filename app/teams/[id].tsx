import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

export default function TeamDetailScreen() {
    const { id } = useLocalSearchParams();
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const docRef = doc(db, 'teams', String(id));
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTeam(docSnap.data());
                }
            } catch (error) {
                console.error('모임 정보 불러오기 실패:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTeam();
    }, [id]);

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#888" />
            </SafeAreaView>
        );
    }

    if (!team) {
        return (
            <SafeAreaView style={styles.center}>
                <Text>모임 정보를 찾을 수 없습니다.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.name}>📌 {team.name}</Text>
                <Text style={styles.meta}>👤 모임장: {team.leader}</Text>
                {team.description ? (
                    <Text style={styles.description}>{team.description}</Text>
                ) : (
                    <Text style={styles.descriptionGray}>소개가 없습니다.</Text>
                )}
            </View>

            <TouchableOpacity style={styles.joinButton}>
                <Text style={styles.joinText}>가입하기</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', padding: 24 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        marginBottom: 30,
    },

    name: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
    meta: { fontSize: 16, marginBottom: 12 },
    description: { fontSize: 15, lineHeight: 22, color: '#333' },
    descriptionGray: { fontSize: 15, lineHeight: 22, color: '#999' },

    joinButton: {
        backgroundColor: '#10b981',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    joinText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
