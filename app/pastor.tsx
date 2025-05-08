import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';

export default function PastorPage() {
    const [prayers, setPrayers] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);

    useEffect(() => {
        fetchPrayers();
        fetchTeams();
    }, []);

    const fetchPrayers = async () => {
        const q = query(collection(db, 'prayer_requests')); // 전체
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPrayers(list);
    };

    const fetchTeams = async () => {
        const q = query(collection(db, 'teams'), where('approved', '==', false));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTeams(list);
    };

    const approveTeam = async (id: string) => {
        await updateDoc(doc(db, 'teams', id), { approved: true });
        Alert.alert('승인 완료');
        fetchTeams();
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.sectionTitle}>📖 기도제목 전체</Text>
            <FlatList
                data={prayers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardText}>🙏 {item.name}</Text>
                        <Text style={styles.cardText}>{item.content}</Text>
                        <Text style={styles.cardText}>({item.visibility === 'pastor' ? '🔒 교역자 전용' : '🌐 전체공개'})</Text>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>기도제목이 없습니다.</Text>}
            />

            <Text style={styles.sectionTitle}>📝 소모임 승인 대기</Text>
            <FlatList
                data={teams}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardText}>👤 {item.leader}</Text>
                        <Text style={styles.cardText}>{item.description}</Text>
                        <TouchableOpacity style={styles.approveButton} onPress={() => approveTeam(item.id)}>
                            <Text style={styles.approveText}>✅ 승인</Text>
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>승인 대기 소모임이 없습니다.</Text>}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6', padding: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 12 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, shadowOpacity: 0.1, elevation: 2 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    cardText: { fontSize: 14, color: '#374151', marginBottom: 2 },
    approveButton: { marginTop: 10, backgroundColor: '#10b981', padding: 10, borderRadius: 6 },
    approveText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
    empty: { textAlign: 'center', color: '#6b7280', marginTop: 20 },
});
