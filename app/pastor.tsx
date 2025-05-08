// app/pastor.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import {
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useLocalSearchParams } from 'expo-router';

const initialLayout = { width: Dimensions.get('window').width };

export default function PastorPage() {
    const { tab } = useLocalSearchParams();
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'prayers', title: '기도제목' },
        { key: 'teams', title: '소모임 승인' },
    ]);

    const [prayers, setPrayers] = useState<any[]>([]);
    const [pendingTeams, setPendingTeams] = useState<any[]>([]);

    const fetchData = async () => {
        const prayerQuery = query(collection(db, 'prayer_requests'));
        const prayerSnap = await getDocs(prayerQuery);
        setPrayers(prayerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const teamQuery = query(collection(db, 'teams'), where('approved', '==', false));
        const teamSnap = await getDocs(teamQuery);
        setPendingTeams(teamSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const approveTeam = async (id: string) => {
        await updateDoc(doc(db, 'teams', id), { approved: true });
        fetchData();
    };

    useEffect(() => {
        if (tab === 'teams') setIndex(1);
        else setIndex(0);

        fetchData();
    }, [tab]);

    const PrayersRoute = () => (
        <FlatList
            data={prayers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                    <Text style={styles.meta}>🙋 {item.name}</Text>
                    <Text style={styles.content}>{item.content}</Text>
                    <Text style={styles.meta}>📢 공개: {item.visibility === 'pastor' ? '교역자만' : '전체'}</Text>
                </View>
            )}
        />
    );

    const TeamsRoute = () => (
        <FlatList
            data={pendingTeams}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{item.name}</Text>
                    <Text style={styles.meta}>👤 모임장: {item.leader}</Text>
                    <Text style={styles.content}>{item.description}</Text>
                    <TouchableOpacity style={styles.approveButton} onPress={() => approveTeam(item.id)}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>승인하기</Text>
                    </TouchableOpacity>
                </View>
            )}
        />
    );

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <TabView
                navigationState={{ index, routes }}
                renderScene={SceneMap({ prayers: PrayersRoute, teams: TeamsRoute })}
                onIndexChange={setIndex}
                initialLayout={initialLayout}
                renderTabBar={props => (
                    <TabBar
                        {...props}
                        indicatorStyle={{ backgroundColor: '#2563eb' }}
                        style={{ backgroundColor: '#fff' }}
                        activeColor="#2563eb"
                        inactiveColor="#6b7280"
                    />
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
    meta: { fontSize: 14, color: '#6b7280' },
    content: { fontSize: 15, marginVertical: 6 },
    approveButton: {
        marginTop: 12,
        backgroundColor: '#2563eb',
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
    },
});
