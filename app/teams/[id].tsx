//app/teams/[id].tsx
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { showToast } from "@/utils/toast"; // ✅ 추가
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    arrayRemove,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    onSnapshot,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert, Image,
    KeyboardAvoidingView,
    Modal,
    Platform, RefreshControl,
    SafeAreaView,
    ScrollView,
    Share,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Toast from "react-native-root-toast";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Team = {
    id: string;
    name: string;
    leader: string;
    leaderEmail: string;
    members: number;
    capacity: number;
    membersList: string[];
    announcement?: string;
    scheduleDate?: string; // YYYY-MM-DD
    [key: string]: any; // 기타 필드를 허용하는 경우
};

export default function TeamDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [memberUsers, setMemberUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const { colors, font, spacing, radius } = useDesign();
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const [currentUser, setCurrentUser] = useState<any>(null);
    const isCreator = team?.leaderEmail === user?.email;
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false); // 추가

    //수정
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCapacity, setEditCapacity] = useState('');

    const [announcement, setAnnouncement] = useState(team?.announcement || '');
    const [scheduleDate, setScheduleDate] = useState(team?.scheduleDate || '');
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    const [alreadyRequested, setAlreadyRequested] = useState(false);


    const [chatBadgeCount, setChatBadgeCount] = useState(0);
    useEffect(() => {
        getCurrentUser().then(setCurrentUser);
    }, []);

    useEffect(() => {
        const unsubscribe = fetchTeam();
        return () => unsubscribe && unsubscribe();
    }, []);

    useEffect(() => {
        const checkJoinRequest = async () => {
            if (!user || !team) return;

            const q = query(
                collection(db, 'notifications'),
                where('type', '==', 'team_join_request'),
                where('teamId', '==', team.id),
                where('applicantEmail', '==', user.email),
            );

            const snap = await getDocs(q);
            if (!snap.empty) {
                setAlreadyRequested(true); // 이미 신청한 상태로 처리
            }
        };

        checkJoinRequest();
    }, [user, team]);

// 🔄 API 호출 로직 분리
    const fetchTeam = () => {
        const teamRef = doc(db, 'teams', id);

        const unsubscribe = onSnapshot(teamRef, async (docSnap) => {
            if (!docSnap.exists()) return;

            const teamData = { id: docSnap.id, ...docSnap.data() } as Team;
            setTeam(teamData);

            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);

                const emails = Array.from(new Set(teamData.membersList || []));
                if (emails.length > 0) {
                    const batches = [];
                    const cloned = [...emails];
                    while (cloned.length) {
                        const batch = cloned.splice(0, 10);
                        batches.push(query(collection(db, 'users'), where('email', 'in', batch)));
                    }
                    const results = await Promise.all(batches.map(q => getDocs(q)));
                    const users = results.flatMap(snap => snap.docs.map(doc => doc.data()));
                    setMemberUsers(users);
                }
            } catch (e) {
                console.error('❌ 사용자/멤버 정보 로딩 실패:', e);
            } finally {
                setLoading(false);     // ✅ 로딩 완료 처리
                setRefreshing(false);  // ✅ 리프레시 완료 처리
            }
        });

        return unsubscribe;
    };
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        unsubscribe = fetchTeam();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    useEffect(() => {
        const setupBadgeListener = async () => {
            if (!id) return; // `id`는 useLocalSearchParams에서 가져온 팀 ID
            const user = await getCurrentUser();
            if (!user?.email) return;

            const badgeRef = doc(db, 'teams', id, 'chatBadge', user.email);
            const unsubscribe = onSnapshot(badgeRef, (snap) => {
                const count = snap.exists() ? snap.data()?.count || 0 : 0;
                console.log('📥 실시간 badge count:', count); // ✅ 디버깅 로그
                setChatBadgeCount(count);
            });

            return unsubscribe;
        };

        let unsubscribe: (() => void) | undefined;
        setupBadgeListener().then((unsub) => {
            unsubscribe = unsub;
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [id]); // team.id 대신 id 사용

    const handleJoin = async () => {
        if (!team || !user) return;

        if (team.membersList?.includes(user.email)) {
            Alert.alert('참여 불가', '이미 가입된 모임입니다.');
            return;
        }

        if ((team.membersList?.length ?? 0) >= (team.maxMembers ?? 99)) {
            Alert.alert('인원 초과', '모집이 마감되었습니다.');
            return;
        }

        // ✅ 1. Push 토큰 가져오기 (email 기준으로)
        const q = query(collection(db, 'expoTokens'), where('email', '==', team.leaderEmail));
        const snap = await getDocs(q);
        const tokens: string[] = snap.docs.map(doc => doc.data().token).filter(Boolean);

// ✅ 2. Firestore 알림 저장 (email 저장)
        await sendNotification({
            to: team.leaderEmail, // Firestore 알림 받는 주체(email)
            message: `${user.name}님이 "${team.name}" 모임에 가입 신청했습니다.`,
            type: 'team_join_request',
            link: '/notifications',
            teamId: team.id,
            teamName: team.name,
            applicantEmail: user.email,
            applicantName: user.name,
        });

// ✅ 3. Expo 푸시 전송 (token 기반)
        if (tokens.length > 0) {
            await sendPushNotification({
                to: tokens,
                title: '🙋 소모임 가입 신청',
                body: `${user.name}님의 신청`,
            });
        }

        showToast('✅가입 신청 완료: 모임장에게 신청 메시지를 보냈습니다.');
        fetchTeam();  // ✅ 추가된 부분
        router.back();
    };

    const openEditModal = () => {
        if (!team) return;
        setEditName(team.name);
        setEditDescription(team.description || '');
        setAnnouncement(team.announcement || '');
        setEditCapacity(String(team.maxMembers ?? ''));
        setEditModalVisible(true);
    };

    const handleUpdateTeam = async () => {
        if (!team) return;

        const currentCount = team.membersList?.length ?? 0;
        const newMax = Number(editCapacity);

        if (isNaN(newMax) || newMax < currentCount) {
            Alert.alert(
                '유효하지 않은 최대 인원',
                `현재 모임 인원(${currentCount}명)보다 작을 수 없습니다.`
            );
            return;
        }

        try {
            const teamRef = doc(db, 'teams', team.id);
            await updateDoc(teamRef, {
                name: editName,
                description: editDescription,
                maxMembers: Number(editCapacity),
                announcement,      // ✅ 추가 필요
                scheduleDate,      // ✅ 추가 필요
            });

            setTeam(prev => prev && {
                ...prev,
                name: editName,
                description: editDescription,
                maxMembers: Number(editCapacity),
                announcement,
                scheduleDate,
            });

            setEditModalVisible(false);
            Toast.show('✅ 수정 완료', { duration: 1500 });
            fetchTeam();  // ← 🔥 명시적으로 새로고침
        } catch (e) {
            console.error('❌ 모임 정보 수정 실패:', e);
            Alert.alert('에러', '모임 수정 중 문제가 발생했습니다.');
        }
    };

    const handleKick = async (email: string) => {
        if (!team) return;

        // ✅ 이메일에 해당하는 사용자 이름 찾기
        const member = memberUsers.find(m => m.email === email);
        const displayName = member?.name || email;

        Alert.alert('정말 강퇴하시겠습니까?', displayName, [
            { text: '취소', style: 'cancel' },
            {
                text: '강퇴', style: 'destructive', onPress: async () => {
                    try {
                        const teamRef = doc(db, 'teams', team.id);
                        await updateDoc(teamRef, {
                            membersList: arrayRemove(email),
                            members: increment(-1),
                        });

                        const updatedSnap = await getDoc(teamRef);
                        if (updatedSnap.exists()) {
                            const updatedData = updatedSnap.data();
                            setTeam({
                                id: updatedSnap.id,
                                name: updatedData.name,
                                leader: updatedData.leader,
                                leaderEmail: updatedData.leaderEmail,
                                members: updatedData.members,
                                capacity: updatedData.capacity,
                                membersList: updatedData.membersList,
                                ...updatedData, // 기타 필드
                            });
                        }

                        setMemberUsers(prev => prev.filter(m => m.email !== email));
                        fetchTeam();  // ✅ 추가된 부분
                        Alert.alert('강퇴 완료', `${displayName}님이 강퇴되었습니다.`);
                    } catch (e) {
                        console.error('❌ 강퇴 실패:', e);
                        Alert.alert('에러', '강퇴에 실패했습니다.');
                    }
                }
            }
        ]);
    };

    const deleteTeam = async (id: string) => {
        Alert.alert('삭제 확인', '정말로 이 소모임을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'teams', id));
                        setTeam(null); // ❗단일 객체니까 이렇게 처리
                        showToast('✅삭제 완료: 소모임이 삭제되었습니다.');
                        router.replace('/teams'); // 삭제 후 소모임 목록으로 이동
                    } catch (e) {
                        Alert.alert('오류', '삭제에 실패했습니다.');
                        console.error(e);
                    }
                },
            },
        ]);
    };

    const handleDateConfirm = async (date: Date) => {
        if (!team) return;

        const newDate = date.toISOString().slice(0, 10); // YYYY-MM-DD

        // 동일한 날짜면 업데이트/알림 스킵
        if (team.scheduleDate === newDate) {
            setDatePickerVisible(false);
            return;
        }

        setScheduleDate(newDate);
        setDatePickerVisible(false);

        try {
            // 일정 Firestore 업데이트
            const teamRef = doc(db, 'teams', team.id);
            await updateDoc(teamRef, { scheduleDate: newDate });
            setScheduleDate(newDate);

            // ✅ 참여자 이메일 목록 (리더 제외)
            const emails = (team.membersList ?? []).filter(email => email !== team.leaderEmail);

            if (emails.length === 0) return;

            // ✅ 10개씩 나눠서 expoTokens 조회
            const tokenQueryBatches = [];
            const emailClone = [...emails];

            while (emailClone.length) {
                const batch = emailClone.splice(0, 10);
                tokenQueryBatches.push(
                    query(collection(db, 'expoTokens'), where('email', 'in', batch))
                );
            }

            const tokenSnapshots = await Promise.all(tokenQueryBatches.map(q => getDocs(q)));
            const tokens = tokenSnapshots.flatMap(snap =>
                snap.docs.map(doc => doc.data().token).filter(Boolean)
            );

            if (tokens.length > 0) {
                await sendPushNotification({
                    to: tokens,
                    title: `📅 ${team.name} 모임 일정 안내`,
                    body: `모임 일정이 ${newDate}로 정해졌어요!`,
                });

                Toast.show('📢 일정 알림을 모임원에게 전송했어요!', { duration: 1500 });
            }
        } catch (e) {
            console.error('❌ 일정 저장 실패:', e);
            Alert.alert('오류', '일정 저장 중 문제가 발생했습니다.');
        }
    };

    const handleShare = async () => {
        try {
            // 딥링크 URL 생성 (expo-router의 경우)
            const shareUrl = `churchapp://teams/${id}`;
            const shareMessage = `${team?.name} 모임에 참여해보세요!\n\n${shareUrl}`;

            const result = await Share.share({
                message: shareMessage,
                url: shareUrl,  // iOS only
            });

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    // shared with activity type of result.activityType
                    showToast('링크가 공유되었습니다');
                } else {
                    // shared
                    showToast('링크가 공유되었습니다');
                }
            }
        } catch (error) {
            // 공유 실패 시 클립보드에 복사
            const shareUrl = `churchapp://teams/${id}`;
            await Clipboard.setStringAsync(shareUrl);
            showToast('링크가 클립보드에 복사되었습니다');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (!team) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <Text style={{ color: colors.text }}>모임을 찾을 수 없습니다.</Text>
            </SafeAreaView>
        );
    }


    const handleEnterChat = async () => {
        const user = await getCurrentUser();
        if (!user?.email) return;

        try {
            const teamDocRef = doc(db, 'teams', team.id);
            const teamSnap = await getDoc(teamDocRef);

            if (!teamSnap.exists()) {
                showToast('팀 정보를 찾을 수 없습니다.');
                return;
            }

            const teamData = teamSnap.data();
            const membersList: string[] = teamData.membersList || [];

            if (!membersList.includes(user.email)) {
                showToast('⚠️ 팀 멤버만 채팅방에 입장할 수 있습니다.');
                return;
            }

            router.push(`/teams/${team.id}/chat?name=${encodeURIComponent(team.name)}`);
        } catch (error) {
            console.error('채팅방 입장 오류:', error);
            showToast('⚠️ 채팅방 입장 중 오류가 발생했습니다.');
        }
    };

    const isFull = (team?.members ?? 0) >= (team?.capacity ?? 99);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 56,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}>
                <TouchableOpacity 
                    onPress={() => router.back()}
                    style={{ padding: 8 }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                
                <Text style={{
                    flex: 1,
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: colors.text,
                    textAlign: 'center',
                    marginRight: 80,  // Increased to account for both buttons
                }}>
                    {team?.name || '모임'}
                </Text>

                <View style={{
                    position: 'absolute',
                    right: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}>
                    <TouchableOpacity 
                        onPress={handleShare}
                        style={{
                            padding: 8,
                            marginRight: 8,
                        }}
                    >
                        <Ionicons name="share-outline" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleEnterChat}
                        style={{ padding: 8 }}
                    >
                        <View style={{ position: 'relative' }}>
                            <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
                            {chatBadgeCount > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: -5,
                                    right: -5,
                                    backgroundColor: colors.primary,
                                    borderRadius: 10,
                                    minWidth: 16,
                                    height: 16,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: '#fff',
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                    }}>
                                        {chatBadgeCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingLeft: spacing.lg, paddingRight: spacing.lg, paddingBottom: '15%' ,gap: spacing.lg}}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={fetchTeam}
                                tintColor={colors.primary}
                            />
                        }>
                {team.thumbnail && (
                    <Image
                        source={{ uri: team.thumbnail }}
                        style={{ width: '100%', height: 180, borderRadius: radius.lg, backgroundColor: colors.border }}
                    />
                )}

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
                    shadowColor: isDark ? 'transparent' : '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 2,}}>
                    <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>{team.name}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext, marginBottom: spacing.sm }}>by {team.leader}</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                        <Text style={{ fontSize: font.caption, color: colors.text }}>📍 {team.location || '장소미정'}</Text>
                        {isCreator ? (
                            <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
                                <Text style={{ fontSize: font.caption, color: colors.text }}>
                                    📅 {scheduleDate ? `${scheduleDate} (D${(() => {
                                    const today = new Date();
                                    const target = new Date(scheduleDate);
                                    const diff = Math.ceil((target.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                                    return diff >= 0 ? `-${diff}` : `+${Math.abs(diff)}`;
                                })()})` : '일정 선택'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={{ fontSize: font.caption, color: colors.text }}>
                                📅 {scheduleDate
                                ? `${scheduleDate} (D${(() => {
                                    const today = new Date();
                                    const target = new Date(scheduleDate);
                                    const diff = Math.ceil((target.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                                    return diff >= 0 ? `-${diff}` : `+${Math.abs(diff)}`;
                                })()})`
                                : '일정 미정'}
                            </Text>
                        )}
                    </View>
                    <DateTimePickerModal
                        isVisible={isDatePickerVisible}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'calendar'} // ✅ iOS에서 달력형은 'inline'
                        onConfirm={(date) => {
                            setScheduleDate(date.toISOString().slice(0, 10)); // YYYY-MM-DD
                            setDatePickerVisible(false)
                            handleDateConfirm(date);
                        }}
                        onCancel={() => setDatePickerVisible(false)}
                    />

                    {/* ✅ 인원수: membersList 기준 */}
                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>
                        👥 {team.membersList?.length ?? 0} / {team.maxMembers ?? '명'}
                    </Text>
                </View>

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
                    shadowColor: isDark ? 'transparent' : '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 2,}}>
                    <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>모임 소개</Text>
                    <Text style={{ fontSize: font.body, color: colors.text, lineHeight: 22 }}>{team.description}</Text>
                </View>

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
                    shadowColor: isDark ? 'transparent' : '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 2,}}>
                    <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>공지사항</Text>
                    <Text style={{ fontSize: font.body, color: colors.text, lineHeight: 22 }}>{team.announcement}</Text>
                </View>

                <Modal visible={editModalVisible} animationType="slide" transparent>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            padding: 20,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                        }}
                    >
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'center',
                        padding: 20,
                    }}>
                        <View style={{
                            backgroundColor: colors.surface,
                            padding: spacing.lg,
                            borderRadius: radius.lg,
                        }}>
                            <Text style={{ fontSize: font.body, color: colors.text, marginBottom: spacing.sm }}>모임명</Text>
                            <TextInput
                                value={editName}
                                onChangeText={setEditName}
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.sm,
                                    padding: spacing.sm,
                                    marginBottom: spacing.md,
                                    color: colors.text
                                }}
                            />

                            <Text style={{ fontSize: font.body, color: colors.text, marginBottom: spacing.sm }}>모임 소개</Text>
                            <TextInput
                                value={editDescription}
                                onChangeText={setEditDescription}
                                multiline
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.sm,
                                    padding: spacing.sm,
                                    height: 100,
                                    marginBottom: spacing.md,
                                    color: colors.text
                                }}
                            />

                            <Text style={{ fontSize: font.body, color: colors.text, marginBottom: spacing.sm }}>공지사항</Text>
                            <TextInput
                                value={announcement}
                                onChangeText={setAnnouncement}
                                multiline
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.sm,
                                    padding: spacing.sm,
                                    height: 100,
                                    marginBottom: spacing.md,
                                    color: colors.text
                                }}
                            />

                            <Text style={{ fontSize: font.body, color: colors.text, marginBottom: spacing.sm }}>최대 인원수</Text>
                            <TextInput
                                value={editCapacity}
                                onChangeText={setEditCapacity}
                                keyboardType="number-pad"
                                style={{
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: radius.sm,
                                    padding: spacing.sm,
                                    marginBottom: spacing.md,
                                    color: colors.text
                                }}
                            />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                    <Text style={{ color: colors.subtext }}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleUpdateTeam}>
                                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>저장</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    </KeyboardAvoidingView>
                </Modal>


                {memberUsers.length > 0 && (
                    <View style={{
                        backgroundColor: colors.surface,
                        borderRadius: radius.lg,
                        padding: spacing.lg,
                        shadowColor: isDark ? 'transparent' : '#000',
                        shadowOpacity: 0.05,
                        shadowRadius: 6,
                        elevation: 2,
                    }}>
                        <Text style={{
                            fontSize: font.body,
                            fontWeight: '600',
                            color: colors.text,
                            marginBottom: spacing.sm
                        }}>
                            🙋 현재 참여자
                        </Text>

                        {[...memberUsers]
                            .sort((a, b) => (a.email === team.leaderEmail ? -1 : 1))
                            .map((member) => (
                                <View
                                    key={member.email}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 10,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: member.email === team.leaderEmail ? colors.primary : colors.text,
                                            fontWeight: member.email === team.leaderEmail ? 'bold' : 'normal',
                                        }}
                                    >
                                        {member.email === team.leaderEmail && '👑 '}
                                        {member.name}
                                    </Text>

                                    {isCreator && member.email !== user.email && (
                                        <TouchableOpacity onPress={() => handleKick(member.email)}>
                                            <Text style={{ color: colors.error }}>강퇴</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                    </View>
                )}



                {isCreator && (
                    <View>
                        <TouchableOpacity
                            onPress={openEditModal}
                            style={{
                                backgroundColor: colors.primary,
                                paddingVertical: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                                marginBottom: spacing.sm,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>
                                ✏️ 모임 정보 수정
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => deleteTeam(team.id)}
                            style={{
                                backgroundColor: colors.error,
                                paddingVertical: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                                marginTop: spacing.md,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>
                                🗑️ 모임 삭제하기
                            </Text>
                        </TouchableOpacity>
                    </View>


                )}

                {!isFull && !isCreator && !team.membersList?.includes(user.email) && (
                    <TouchableOpacity
                        onPress={alreadyRequested ? undefined : handleJoin}
                        disabled={isFull || alreadyRequested}
                        style={{
                            backgroundColor: isFull || alreadyRequested ? colors.border : colors.primary,
                            paddingVertical: spacing.md,
                            borderRadius: radius.md,
                            alignItems: 'center',
                            marginTop: spacing.sm,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: font.body, fontWeight: '600' }}>
                            {isFull ? '모집마감' : alreadyRequested ? '가입 신청 완료' : '가입 신청하기'}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
