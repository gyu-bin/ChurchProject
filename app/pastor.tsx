// ✅ 두 페이지 모두 공통 디자인 시스템 적용
// ✅ 다크모드 대응 (useAppTheme + useDesign 적용)

// 📁 app/pastor.tsx 전체 수정본
import React, { useEffect, useState } from 'react';
import {
    View, Text, SafeAreaView, FlatList, TouchableOpacity, Dimensions, Alert
} from 'react-native';
import {
    collection, getDocs, query, orderBy, updateDoc, doc, getDoc, where
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useLocalSearchParams } from 'expo-router';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';

const initialLayout = { width: Dimensions.get('window').width };

export default function PastorPage() {
    const { tab } = useLocalSearchParams();
    const [index, setIndex] = useState(tab === 'teams' ? 1 : 0);
    const [routes] = useState([
        { key: 'prayers', title: '기도제목' },
        { key: 'teams', title: '소모임 승인' },
    ]);

    const [prayers, setPrayers] = useState<any[]>([]);
    const [pendingTeams, setPendingTeams] = useState<any[]>([]);

    const { colors, spacing, font, radius } = useDesign();

    const fetchData = async () => {
        const prayerSnap = await getDocs(
            query(collection(db, 'prayer_requests'), orderBy('createdAt', 'desc'))
        );
        setPrayers(prayerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const teamSnap = await getDocs(
            query(collection(db, 'teams'), orderBy('createdAt', 'desc'))
        );
        setPendingTeams(teamSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => {
        fetchData();
    }, [tab]);

    const approveTeam = async (id: string) => {
        try {
            const teamRef = doc(db, 'teams', id);
            const teamSnap = await getDoc(teamRef);
            if (!teamSnap.exists()) {
                Alert.alert('오류', '해당 모임을 찾을 수 없습니다.');
                return;
            }
            const teamData = teamSnap.data();
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

            Alert.alert('승인 완료', '소모임이 승인되었습니다.');
            setPendingTeams(prev => prev.filter(team => team.id !== id));
        } catch (e) {
            console.error(e);
            Alert.alert('오류', '승인에 실패했습니다.');
        }
    };

    const PrayersRoute = () => (
        <FlatList
            data={prayers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: spacing.lg }}
            renderItem={({ item }) => (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
                    <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text }}>{item.title}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>🙋 {item.name}</Text>
                    <Text style={{ fontSize: font.body, color: colors.text, marginVertical: spacing.sm }}>{item.content}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>📢 공개: {item.visibility === 'pastor' ? '교역자만' : '전체'}</Text>
                </View>
            )}
        />
    );

    const TeamsRoute = () => (
        <FlatList
            data={pendingTeams}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: spacing.lg }}
            renderItem={({ item }) => (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
                    <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text }}>{item.name}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>👤 모임장: {item.leader}</Text>
                    <Text style={{ fontSize: font.body, color: colors.text, marginVertical: spacing.sm }}>{item.description}</Text>
                    <TouchableOpacity
                        onPress={() => approveTeam(item.id)}
                        style={{ backgroundColor: colors.primary, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>승인하기</Text>
                    </TouchableOpacity>
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
