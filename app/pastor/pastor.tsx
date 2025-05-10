// ✅ 전체수정된 pastor/pastor 코드
import React, {useCallback, useEffect, useState} from 'react';
import {
    View, Text, SafeAreaView, FlatList, TouchableOpacity, Dimensions, Alert,RefreshControl
} from 'react-native';
import {
    collection, getDocs, query, orderBy, updateDoc, doc, getDoc, where, deleteDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useLocalSearchParams } from 'expo-router';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import { getCurrentUser } from '@/services/authService';
import { format } from 'date-fns';

const initialLayout = { width: Dimensions.get('window').width };

interface Team {
    id: string;
    name: string;
    leader: string;
    leaderEmail: string;
    description: string;
    approved?: boolean;
    createdAt?: {
        toDate: () => Date;
    };
}

export default function PastorPage() {
    const { tab } = useLocalSearchParams();
    const [index, setIndex] = useState(tab === 'teams' ? 1 : 0);
    const [routes] = useState([
        { key: 'prayers', title: '기도제목' },
        { key: 'teams', title: '소모임 승인' },
    ]);

    const [prayers, setPrayers] = useState<any[]>([]);
    const [pendingTeams, setPendingTeams] = useState<Team[]>([]);
    const { colors, spacing, font, radius } = useDesign();
    const [refreshing, setRefreshing] = useState(false);
    useEffect(() => {
        const fetchData = async () => {
            const currentUser = await getCurrentUser();

            const prayerSnap = await getDocs(
                query(collection(db, 'prayer_requests'), orderBy('createdAt', 'desc'))
            );
            setPrayers(prayerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const teamSnap = await getDocs(
                query(collection(db, 'teams'), orderBy('createdAt', 'desc'))
            );
            const allTeams = teamSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    leader: data.leader,
                    leaderEmail: data.leaderEmail,
                    description: data.description,
                    approved: data.approved ?? false,
                    createdAt: data.createdAt, // ✅ 요청일용 필드 추가
                } as Team;
            });

            const filtered = allTeams.filter(
                (team: any) => !team.approved && team.leaderEmail !== currentUser.email
            );

            setPendingTeams(filtered);
        };

        fetchData();
    }, [tab]);

    const deleteRelatedNotifications = async (teamId: string) => {
        const q = query(collection(db, 'notifications'), where('teamId', '==', teamId));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, 'notifications', docSnap.id)));
        await Promise.all(deletePromises);
    };

    // 새로고침 함수
    // ⏳ 최소 500ms 정도는 로딩 애니메이션을 유지하도록 딜레이 추가
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const currentUser = await getCurrentUser();

            const prayerSnap = await getDocs(
                query(collection(db, 'prayer_requests'), orderBy('createdAt', 'desc'))
            );
            setPrayers(prayerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const teamSnap = await getDocs(
                query(collection(db, 'teams'), orderBy('createdAt', 'desc'))
            );
            const allTeams = teamSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    leader: data.leader,
                    leaderEmail: data.leaderEmail,
                    description: data.description,
                    approved: data.approved ?? false,
                    createdAt: data.createdAt,
                } as Team;
            });
            const filtered = allTeams.filter(
                (team: any) => !team.approved && team.leaderEmail !== currentUser.email
            );
            setPendingTeams(filtered);

            // 👇 최소한 500ms 이상 보여주기
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
            console.error('❌ 새로고침 실패:', e);
        }
        setRefreshing(false);
    }, []);

    const approveTeam = async (teamId: string) => {
        try {
            const teamRef = doc(db, 'teams', teamId);
            const teamSnap = await getDoc(teamRef);
            if (!teamSnap.exists()) {
                Alert.alert('오류', '해당 모임을 찾을 수 없습니다.');
                return;
            }

            const teamData = teamSnap.data() as Team;
            await updateDoc(teamRef, { approved: true });

            await sendNotification({
                to: teamData.leaderEmail,
                message: `"${teamData.name}" 소모임이 승인되었습니다.`,
                type: 'team_create_approved',
                link: '/teams',
            });

            const tokenSnap = await getDocs(query(
                collection(db, 'expoTokens'),
                where('email', '==', teamData.leaderEmail)
            ));
            if (!tokenSnap.empty) {
                const token = tokenSnap.docs[0].data().token;
                await sendPushNotification({
                    to: token,
                    title: '✅ 소모임 승인 완료',
                    body: `"${teamData.name}" 소모임이 승인되었어요.`,
                });
            }

            await deleteRelatedNotifications(teamId); // ✅ 알림 삭제

            Alert.alert('승인 완료', '소모임이 승인되었습니다.');
            setPendingTeams(prev => prev.filter(team => team.id !== teamId));
        } catch (e) {
            console.error(e);
            Alert.alert('오류', '승인에 실패했습니다.');
        }
    };

    const deleteTeamRequest = async (teamId: string) => {
        Alert.alert('삭제 확인', '정말로 이 소모임 요청을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'teams', teamId));
                        await deleteRelatedNotifications(teamId);
                        setPendingTeams(prev => prev.filter(team => team.id !== teamId));
                        Alert.alert('삭제 완료', '소모임 요청이 삭제되었습니다.');
                    } catch (e) {
                        console.error('❌ 삭제 실패:', e);
                        Alert.alert('오류', '삭제에 실패했습니다.');
                    }
                }
            }
        ]);
    };

    const deletePrayer = async (id: string) => {
        Alert.alert('삭제 확인', '정말 이 기도제목을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제', style: 'destructive', onPress: async () => {
                    await deleteDoc(doc(db, 'prayer_requests', id));
                    setPrayers(prev => prev.filter(p => p.id !== id));
                }
            }
        ]);
    };

    const PrayersRoute = () => (
        <FlatList
            data={prayers.filter(p => p.visibility === 'pastor')}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: spacing.lg }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
                    <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text }}>{item.title}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>🙋 {item.name}</Text>
                    <Text style={{ fontSize: font.body, color: colors.text, marginVertical: spacing.sm }}>{item.content}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>📢 공개: {item.visibility === 'pastor' ? '교역자만' : '전체'}</Text>
                    {item.createdAt?.toDate && (
                        <Text style={{ fontSize: font.caption, color: colors.subtext }}>🕒 {format(item.createdAt.toDate(), 'yy-MM-dd HH:mm')}</Text>
                    )}
                    <TouchableOpacity onPress={() => deletePrayer(item.id)} style={{ marginTop: spacing.sm, backgroundColor: colors.error, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>삭제</Text>
                    </TouchableOpacity>
                </View>
            )}
        />
    );

    const TeamsRoute = () => (
        <FlatList
            data={pendingTeams}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: spacing.lg }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
                    <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text }}>{item.name}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>👤 모임장: {item.leader}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: 4 }}>🕒 요청일: {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'yy-MM-dd HH:mm') : '시간 정보 없음'}</Text>
                    <Text style={{ fontSize: font.body, color: colors.text, marginVertical: spacing.sm }}>{item.description}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md }}>
                        <TouchableOpacity onPress={() => approveTeam(item.id)} style={{ flex: 1, backgroundColor: colors.primary, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>승인하기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteTeamRequest(item.id)} style={{ flex: 1, backgroundColor: colors.error, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>삭제하기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        />
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <TabView
                navigationState={{ index, routes }}
                renderScene={SceneMap({ prayers: PrayersRoute, teams: TeamsRoute })}
                onIndexChange={setIndex}
                initialLayout={initialLayout}
                renderTabBar={props => (
                    <TabBar
                        {...props}
                        indicatorStyle={{ backgroundColor: colors.primary }}
                        style={{ backgroundColor: colors.surface }}
                        activeColor={colors.primary}
                        inactiveColor={colors.subtext}
                    />
                )}
            />
        </SafeAreaView>
    );
}
