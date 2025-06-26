import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { arrayRemove, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform, SafeAreaView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-root-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

            if (team.leaderEmail === user.email) {
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
            <SafeAreaView
                style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    paddingTop: Platform.OS === 'android' ? insets.top + 20 : insets.top,
                }}
            >
                <View style={{ paddingHorizontal: 20 }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 32
                    }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: colors.surface,
                                marginRight: 16
                            }}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{
                            fontSize: 28,
                            fontWeight: '600',
                            color: colors.text
                        }}>
                            내 모임
                        </Text>
                    </View>
                </View>
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.background,
                    paddingBottom: '15%'
                }}>
                    <Text style={{
                        fontSize: 18,
                        color: colors.subtext,
                        marginBottom: 8
                    }}>
                        아직 가입한 모임이 없어요
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push('/teams')}
                        style={{
                            backgroundColor: colors.primary,
                            paddingVertical: 12,
                            paddingHorizontal: 20,
                            borderRadius: 12,
                            marginTop: 16
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                            모임 찾아보기
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
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
            <View style={{ paddingHorizontal: 20 }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 32
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: colors.surface,
                                marginRight: 16
                            }}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{
                            fontSize: 28,
                            fontWeight: '600',
                            color: colors.text
                        }}>
                            내 모임
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleLeave}
                        style={{
                            backgroundColor: selectMode ? colors.error : colors.surface,
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            borderRadius: 20,
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}
                    >
                        <Text style={{
                            color: selectMode ? '#fff' : colors.text,
                            fontSize: 15,
                            fontWeight: '500'
                        }}>
                            {selectMode ? (selectedIds.length > 0 ? '탈퇴하기' : '취소') : '선택하기'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={teams}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20 }}
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
                                padding: 20,
                                marginBottom: 12,
                                borderRadius: 24,
                                borderWidth: selected ? 2 : 0,
                                borderColor: selected ? colors.primary : 'transparent',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOpacity: 0.08,
                                shadowRadius: 8,
                                shadowOffset: {
                                    width: 0,
                                    height: 4
                                },
                                elevation: 3
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{
                                        fontSize: 18,
                                        fontWeight: '600',
                                        color: colors.text,
                                        marginRight: 8
                                    }}>
                                        {item.name}
                                    </Text>
                                    {item.leaderEmail === userEmail && (
                                        <View style={{
                                            backgroundColor: '#fef3c7',
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 12
                                        }}>
                                            <Text style={{
                                                color: '#d97706',
                                                fontSize: 13,
                                                fontWeight: '600'
                                            }}>
                                                모임장
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={{
                                    color: colors.subtext,
                                    fontSize: 15
                                }}>
                                    멤버 {item.membersList?.length ?? 0}명
                                </Text>
                            </View>

                            {selectMode ? (
                                <View style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    borderWidth: 2,
                                    borderColor: selected ? colors.primary : colors.border,
                                    backgroundColor: selected ? colors.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {selected && (
                                        <Ionicons name="checkmark" size={16} color="#fff" />
                                    )}
                                </View>
                            ) : (
                                <View style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: colors.primary + '10',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
            />
        </SafeAreaView>
    );
}
