// app/pastor.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Dimensions,Alert
} from 'react-native';
import {
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc,orderBy,getDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useLocalSearchParams } from 'expo-router';
import { sendNotification, sendPushNotification } from '@/services/notificationService';

const initialLayout = { width: Dimensions.get('window').width };

export default function PastorPage() {
    const { tab } = useLocalSearchParams();
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'prayers', title: '기도제목' },
        { key: 'teams', title: '소모임 승인' },
    ]);

    useEffect(() => {
        if (tab === 'teams') {
            setIndex(1);
        }
    }, [tab]);

    const [prayers, setPrayers] = useState<any[]>([]);
    const [pendingTeams, setPendingTeams] = useState<any[]>([]);

    const fetchData = async () => {
        const prayerQuery = query(
            collection(db, 'prayer_requests'),
            // where('visibility', '==', 'pastor'),
            orderBy('createdAt', 'desc') // 🔽 최신순
        );


        const prayerSnap = await getDocs(prayerQuery);
        setPrayers(prayerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const teamQuery = query(
            collection(db, 'teams'),
            // where('approved', '==', false),
            orderBy('createdAt', 'desc') // 🔽 최신순
        );
        const teamSnap = await getDocs(teamQuery);
        setPendingTeams(teamSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const approveTeam = async (id: string) => {
        try {
            // 1. 팀 문서 가져오기
            const teamRef = doc(db, 'teams', id);
            const teamSnap = await getDoc(teamRef);
            if (!teamSnap.exists()) {
                Alert.alert('오류', '해당 모임을 찾을 수 없습니다.');
                return;
            }

            const teamData = teamSnap.data();

            // 2. 승인 처리
            await updateDoc(teamRef, { approved: true });

            // 3. 알림 전송
            await sendNotification({
                to: teamData.leaderEmail,
                message: `"${teamData.name}" 소모임이 승인되었습니다.`,
                type: 'team_create_approved',
                link: '/teams',
            });

            // 4. 푸시 토큰 조회 후 전송
            const q = query(collection(db, 'expoTokens'), where('email', '==', teamData.leaderEmail));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const token = snap.docs[0].data().token;
                await sendPushNotification({
                    to: token,
                    title: '✅ 소모임 승인 완료',
                    body: `"${teamData.name}" 소모임이 승인되었어요.`,
                });
            }

            Alert.alert('승인 완료', '소모임이 승인되었습니다.');
            setPendingTeams((prev) => prev.filter(team => team.id !== id));
        } catch (e) {
            console.error(e);
            Alert.alert('오류', '승인에 실패했습니다.');
        }
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff'  }}>
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
