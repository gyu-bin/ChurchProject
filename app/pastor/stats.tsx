// 📁 app/pastor/stats.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Dimensions, ScrollView } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import { PieChart } from 'react-native-chart-kit';
import { getCurrentUser } from '@/services/authService';
import { useRouter } from 'expo-router';

export default function PastorStatsScreen() {
    const [user, setUser] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [prayers, setPrayers] = useState<any[]>([]);

    const { colors, spacing, font } = useDesign();
    const { mode } = useAppTheme();
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);

            if (currentUser.role !== '교역자') {
                router.replace('/');
                return;
            }

            const userSnap = await getDocs(collection(db, 'users'));
            setUsers(userSnap.docs.map(doc => doc.data()));

            const teamSnap = await getDocs(collection(db, 'teams'));
            setTeams(teamSnap.docs.map(doc => doc.data()));

            const prayerSnap = await getDocs(collection(db, 'prayer_requests'));
            setPrayers(prayerSnap.docs.map(doc => doc.data()));
        };

        fetchData();
    }, []);

    const campusCounts = users.reduce((acc, u) => {
        const c = u.campus || '기타';
        acc[c] = (acc[c] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const divisionCounts = users.reduce((acc, u) => {
        const d = u.division || '기타';
        acc[d] = (acc[d] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const approvedTeams = teams.filter(t => t.approved);
    const pendingTeams = teams.filter(t => !t.approved);

    const chartWidth = Dimensions.get('window').width - 40;

    const toChartData = (obj: Record<string, number>) => Object.entries(obj).map(([k, v], i) => ({
        name: k,
        population: v,
        color: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc949'][i % 6],
        legendFontColor: colors.text,
        legendFontSize: 13,
    }));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md }}>📊 사용자 통계</Text>
                <Text style={{ color: colors.text }}>총 사용자 수: {users.length}</Text>
                <Text style={{ color: colors.text }}>총 소모임 수: {teams.length}</Text>
                <Text style={{ color: colors.text }}>승인된 소모임: {approvedTeams.length}</Text>
                <Text style={{ color: colors.text }}>대기중 소모임: {pendingTeams.length}</Text>
                <Text style={{ color: colors.text, marginBottom: spacing.lg }}>기도제목 수: {prayers.length}</Text>

                <Text style={{ fontSize: font.body, fontWeight: 'bold', marginBottom: spacing.sm, color: colors.text }}>📍 캠퍼스별 사용자 수</Text>
                <PieChart
                    data={toChartData(campusCounts)}
                    width={chartWidth}
                    height={220}
                    accessor={'population'}
                    backgroundColor={'transparent'}
                    paddingLeft={'10'}
                    chartConfig={{
                        backgroundColor: '#fff',
                        color: () => colors.text,
                        labelColor: () => colors.text,
                    }}
                />

                <Text style={{ fontSize: font.body, fontWeight: 'bold', marginTop: spacing.lg, marginBottom: spacing.sm, color: colors.text }}>📚 부서별 사용자 수</Text>
                <PieChart
                    data={toChartData(divisionCounts)}
                    width={chartWidth}
                    height={220}
                    accessor={'population'}
                    backgroundColor={'transparent'}
                    paddingLeft={'10'}
                    chartConfig={{
                        backgroundColor: '#fff',
                        color: () => colors.text,
                        labelColor: () => colors.text,
                    }}
                />
            </ScrollView>
        </SafeAreaView>
    );
}
