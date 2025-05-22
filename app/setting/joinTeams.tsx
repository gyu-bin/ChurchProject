import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, ActivityIndicator,
    TouchableOpacity, Alert, Platform, SafeAreaView
} from 'react-native';
import { getCurrentUser } from '@/services/authService';
import { collection, getDocs, query, where, updateDoc, doc, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';

export default function JoinedTeams() {
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState('');
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { colors, font, spacing, radius } = useDesign();
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const fetchUser = async () => {
            const user = await getCurrentUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        setLoading(true);
        const user = await getCurrentUser();
        if (!user?.email) return;

        const teamsRef = collection(db, 'teams');
        const q = query(teamsRef, where('membersList', 'array-contains', user.email));
        const snap = await getDocs(q);

        const result: any[] = [];
        snap.forEach(doc => result.push({ id: doc.id, ...doc.data() }));

        setTeams(result);
        setLoading(false);
    };

    const toggleSelect = (teamId: string) => {
        setSelectedIds(prev =>
            prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
        );
    };

    const handleLeave = async () => {
        if (selectedIds.length === 0) {
            setSelectMode(prev => !prev);
            return;
        }

        const confirm = await new Promise(resolve => {
            Alert.alert('정말 탈퇴하시겠어요?', '선택한 모임에서 탈퇴됩니다.', [
                { text: '취소', style: 'cancel', onPress: () => resolve(false) },
                {
                    text: '탈퇴',
                    style: 'destructive',
                    onPress: () => resolve(true)
                },
            ]);
        });

        if (!confirm) return;

        const user = await getCurrentUser();
        if (!user?.email) return;

        for (const teamId of selectedIds) {
            const team = teams.find(t => t.id === teamId);

            if (team.ownerEmail === user.email) {
                // 모임장일 경우 모임 자체 삭제
                await deleteDoc(doc(db, 'teams', teamId));
            } else {
                // 일반 멤버일 경우 멤버리스트에서 제거
                await updateDoc(doc(db, 'teams', teamId), {
                    membersList: arrayRemove(user.email),
                });
            }
        }

        setSelectedIds([]);
        setSelectMode(false);
        await fetchTeams();

        Toast.show('✅ 탈퇴되었습니다', {
            duration: Toast.durations.SHORT,
            position: Toast.positions.BOTTOM,
        });
    };

    if (loading || !userEmail) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (teams.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <Text style={{ color: colors.subtext }}>가입한 모임이 없습니다.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: colors.background,
                paddingTop: Platform.OS === 'android' ? insets.top + 20 : insets.top,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: 30 }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{
                    fontSize: font.heading,
                    fontWeight: '600',
                    color: colors.text,
                    textAlign: 'center',
                    flex: 1
                }}>내모임 관리</Text>
            </View>

            <FlatList
                data={teams}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: spacing.md }}
                renderItem={({ item }) => {
                    const selected = selectedIds.includes(item.id);
                    return (
                        <TouchableOpacity
                            onPress={() => {
                                if (selectMode) {
                                    toggleSelect(item.id);
                                } else {
                                    router.push(`/teams/${item.id}`);
                                }
                            }}
                            style={{
                                backgroundColor: colors.surface,
                                padding: spacing.md,
                                marginBottom: spacing.sm,
                                borderRadius: radius.lg,
                                borderWidth: selected ? 2 : 0,
                                borderColor: selected ? colors.primary : 'transparent',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            <View style={{ flexShrink: 1 }}>
                                <Text style={{ fontSize: font.body, color: colors.text, fontWeight: 'bold' }}>
                                    {item.name}
                                </Text>
                                <Text style={{ color: colors.subtext, marginTop: 4 }}>
                                    멤버 수: {item.membersList?.length ?? 0}명
                                </Text>
                                {item.leaderEmail === userEmail && (
                                    <Text style={{ color: colors.primary, fontWeight: 'bold', marginLeft: 8 }}>
                                        👑 모임장
                                    </Text>
                                )}
                            </View>

                            {selectMode && (
                                <Ionicons
                                    name={selected ? 'checkbox' : 'square-outline'}
                                    size={24}
                                    color={selected ? colors.primary : colors.subtext}
                                />
                            )}
                        </TouchableOpacity>
                    );
                }}
            />

            <TouchableOpacity
                onPress={handleLeave}
                style={{
                    margin: spacing.md,
                    backgroundColor: colors.primary,
                    padding: spacing.md,
                    borderRadius: radius.lg,
                    alignItems: 'center',
                }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {selectMode ? '탈퇴하기' : '탈퇴'}
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}
