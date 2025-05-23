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
    setDoc,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform, RefreshControl,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
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
    location?: string;
    meetingTime?: string;
    [key: string]: any; // 기타 필드를 허용하는 경우
};

type VoteStatus = 'yes' | 'no' | 'maybe';

type Vote = {
    userId: string;
    userName: string;
    status: VoteStatus;
    timestamp: number;
};

// Add this type for vote statistics
type VoteStats = {
    yes: number;
    no: number;
    maybe: number;
    total: number;
};

type Schedule = {
    date: string;
    createdAt: number;
    createdBy: string;
    creatorName: string;
    status: 'active' | 'cancelled';
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
    const [refreshing, setRefreshing] = useState(false);

    //수정
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCapacity, setEditCapacity] = useState('');
    const [announcement, setAnnouncement] = useState('');

    const [scheduleDate, setScheduleDate] = useState('');
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    const [alreadyRequested, setAlreadyRequested] = useState(false);

    const [chatBadgeCount, setChatBadgeCount] = useState(0);
    const [isVoteModalVisible, setVoteModalVisible] = useState(false);
    const [votes, setVotes] = useState<{ [key: string]: Vote }>({});
    const [myVote, setMyVote] = useState<VoteStatus | null>(null);
    const [selectedVote, setSelectedVote] = useState<VoteStatus | null>(null);
    const [showVoteStatus, setShowVoteStatus] = useState(false);

    const [isLocationModalVisible, setLocationModalVisible] = useState(false);
    const [locationInput, setLocationInput] = useState('');
    const [commonLocations] = useState([
        '본당',
        '카페',
    ]);

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

    // Add schedule and announcement subscription
    useEffect(() => {
        if (!id) return;

        // Subscribe to team document for schedule and announcement updates
        const teamRef = doc(db, 'teams', id);
        const unsubscribe = onSnapshot(teamRef, (docSnap) => {
            if (!docSnap.exists()) return;
            
            const teamData = docSnap.data();
            if (teamData.scheduleDate) {
                setScheduleDate(teamData.scheduleDate);
            }
            if (teamData.announcement !== undefined) {
                setAnnouncement(teamData.announcement);
            }
        });

        return () => unsubscribe();
    }, [id]);

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
                // console.log('📥 실시간 badge count:', count); // ✅ 디버깅 로그
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

    useEffect(() => {
        if (!team?.id || !scheduleDate) return;

        const votesRef = collection(db, 'teams', team.id, 'scheduleVotes');
        const q = query(votesRef, where('scheduleDate', '==', scheduleDate));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const votesData: { [key: string]: Vote } = {};
            snapshot.docs.forEach((doc) => {
                votesData[doc.id] = doc.data() as Vote;
                if (doc.id === user?.email) {
                    setMyVote(doc.data().status as VoteStatus);
                }
            });
            setVotes(votesData);
        });

        return () => unsubscribe();
    }, [team?.id, scheduleDate]);

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
        if (!team || !user) return;

        const newDate = date.toISOString().slice(0, 10); // YYYY-MM-DD

        // 동일한 날짜면 업데이트/알림 스킵
        if (team.scheduleDate === newDate) {
            setDatePickerVisible(false);
            return;
        }

        try {
            // 1. 팀 문서 업데이트
            const teamRef = doc(db, 'teams', team.id);
            await updateDoc(teamRef, { 
                scheduleDate: newDate,
                lastScheduleUpdate: Date.now(),
            });

            // 2. 스케줄 컬렉션에 새로운 일정 추가
            const scheduleRef = doc(collection(db, 'teams', team.id, 'schedules'));
            const scheduleData: Schedule = {
                date: newDate,
                createdAt: Date.now(),
                createdBy: user.email,
                creatorName: user.name,
                status: 'active',
            };
            await setDoc(scheduleRef, scheduleData);

            setScheduleDate(newDate);
            setDatePickerVisible(false);

            // 3. 기존 투표 데이터 초기화
            const votesRef = collection(db, 'teams', team.id, 'scheduleVotes');
            const votesSnapshot = await getDocs(votesRef);
            const batch = writeBatch(db);
            votesSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // 4. 모임원들에게 알림 전송
            const emails = (team.membersList ?? []).filter(email => email !== team.leaderEmail);
            if (emails.length > 0) {
                // 10개씩 나눠서 expoTokens 조회
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

                // 푸시 알림 전송
                if (tokens.length > 0) {
                    await sendPushNotification({
                        to: tokens,
                        title: `📅 ${team.name} 모임 일정 안내`,
                        body: `모임 일정이 ${newDate}로 정해졌어요! 참석 여부를 투표해주세요.`,
                    });
                }

                // Firestore 알림 저장
                const notificationPromises = emails.map(email => 
                    sendNotification({
                        to: email,
                        message: `${team.name} 모임의 일정이 ${newDate}로 정해졌습니다.`,
                        type: 'schedule_update',
                        link: `/teams/${team.id}`,
                        teamId: team.id,
                        teamName: team.name,
                        scheduleDate: newDate,
                    })
                );
                await Promise.all(notificationPromises);
            }

            showToast('✅ 일정이 저장되었습니다.');
        } catch (e) {
            console.error('❌ 일정 저장 실패:', e);
            showToast('⚠️ 일정 저장에 실패했습니다.');
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

    const handleVote = async (status: VoteStatus) => {
        if (!team?.id || !scheduleDate || !user) return;

        try {
            const voteRef = doc(db, 'teams', team.id, 'scheduleVotes', user.email);
            await setDoc(voteRef, {
                userId: user.email,
                userName: user.name,
                status,
                scheduleDate,
                timestamp: Date.now(),
            });

            setMyVote(status);
            setSelectedVote(null);
            showToast('✅ 투표가 완료되었습니다.');
            
            // 투표 현황을 바로 보여주기 위해 모달 상태 변경
            setShowVoteStatus(true);
        } catch (error) {
            console.error('투표 저장 실패:', error);
            showToast('⚠️ 투표 저장에 실패했습니다.');
        }
    };

    // Add function to calculate vote statistics
    const calculateVoteStats = (): VoteStats => {
        const voteArray = Object.values(votes);
        const total = voteArray.length;
        return {
            yes: voteArray.filter(v => v.status === 'yes').length,
            no: voteArray.filter(v => v.status === 'no').length,
            maybe: voteArray.filter(v => v.status === 'maybe').length,
            total
        };
    };

    const VoteStatusBar = ({ status, count, total, color }: { status: string; count: number; total: number; color: string }) => (
        <View style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: font.caption, color: colors.text }}>{status}</Text>
                <Text style={{ fontSize: font.caption, color: colors.text }}>{count}명</Text>
            </View>
            <View style={{ 
                height: 8,
                backgroundColor: colors.border,
                borderRadius: 4,
                overflow: 'hidden',
            }}>
                <View style={{
                    width: `${(count / (total || 1)) * 100}%`,
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: 4,
                }} />
            </View>
        </View>
    );

    const handleUpdateLocation = async (location: string) => {
        if (!team) return;

        try {
            const teamRef = doc(db, 'teams', team.id);
            await updateDoc(teamRef, {
                location: location,
            });

            setTeam(prev => prev && {
                ...prev,
                location: location,
            });

            setLocationModalVisible(false);
            setLocationInput('');
            showToast('✅ 장소가 업데이트되었습니다.');
        } catch (e) {
            console.error('❌ 장소 업데이트 실패:', e);
            showToast('⚠️ 장소 업데이트에 실패했습니다.');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center', 
                backgroundColor: colors.background,
                paddingTop: Platform.OS === 'android' ? insets.top : 0,
            }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (!team) {
        return (
            <SafeAreaView style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center', 
                backgroundColor: colors.background,
                paddingTop: Platform.OS === 'android' ? insets.top : 0,
            }}>
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
        <SafeAreaView style={{ 
            flex: 1, 
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'android' ? insets.top : 0,
        }}>
            {/* 헤더 */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                height: 56,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: colors.background,
            }}>
                {/* 뒤로가기 버튼 */}
                <TouchableOpacity 
                    onPress={() => router.back()}
                    style={{ 
                        padding: 8,
                        zIndex: 1,
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                
                {/* 모임 이름 */}
                <View style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <Text style={{
                        fontSize: 25,
                        fontWeight: 'bold',
                        color: colors.text,
                    }} numberOfLines={1}>
                        {team?.name || '팀 상세'}
                    </Text>
                </View>

                {/* 우측 버튼 영역 */}
                <View style={{ 
                    flexDirection: 'row',
                    gap: spacing.md,
                    zIndex: 1,
                }}>
                    <View style={{ alignItems: 'center' }}>
                        <TouchableOpacity 
                            onPress={handleShare}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="share-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ 
                            fontSize: 10,
                            color: colors.subtext,
                            marginTop: -4,
                        }}>
                            공유하기
                        </Text>
                    </View>
                    {team.membersList?.includes(user?.email) && (
                        <View style={{ alignItems: 'center' }}>
                            <TouchableOpacity 
                                onPress={handleEnterChat}
                                style={{ padding: 8, position: 'relative' }}
                            >
                                <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
                                {chatBadgeCount > 0 && (
                                    <View style={{
                                        position: 'absolute',
                                        top: 6,
                                        right: 6,
                                        backgroundColor: colors.error,
                                        borderRadius: 8,
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
                            </TouchableOpacity>
                            <Text style={{ 
                                fontSize: 10,
                                color: colors.subtext,
                                marginTop: -4,
                            }}>
                                채팅방
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={{ 
                    paddingHorizontal: spacing.lg, 
                    paddingBottom: '15%',
                    gap: spacing.lg
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={fetchTeam}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* 팀 정보 카드 */}
                <View style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    marginTop: spacing.lg,
                }}>
                    {/* 팀 아이콘 & 이름 */}
                    <View style={{ 
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: spacing.sm,
                    }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: colors.primary + '20',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: spacing.md,
                        }}>
                            <Ionicons name="musical-notes" size={24} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ 
                                fontSize: font.heading,
                                fontWeight: 'bold',
                                color: colors.text,
                                marginBottom: 2,
                            }}>
                                {team.name}
                            </Text>
                            <Text style={{ 
                                fontSize: font.caption,
                                color: colors.subtext,
                            }}>
                                리더: {team.leader}
                            </Text>
                        </View>
                    </View>

                    {/* 장소 & 시간 정보 */}
                    <TouchableOpacity 
                        onPress={() => isCreator && setLocationModalVisible(true)}
                        style={{ 
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: spacing.sm,
                            opacity: isCreator ? 1 : 0.8,
                        }}
                    >
                        <Ionicons name="location-outline" size={16} color={colors.subtext} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: font.body, color: colors.subtext }}>
                            {team.location || '장소를 선택해주세요'}
                        </Text>
                        {isCreator && (
                            <Ionicons name="chevron-forward" size={16} color={colors.subtext} style={{ marginLeft: 4 }} />
                        )}
                    </TouchableOpacity>
                    {team.meetingTime && (
                        <View style={{ 
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: spacing.md,
                        }}>
                            <Ionicons name="time-outline" size={16} color={colors.subtext} style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: font.body, color: colors.subtext }}>
                                {team.meetingTime}
                            </Text>
                        </View>
                    )}

                    {/* 설명 */}
                    {team.description && (
                        <Text style={{ 
                            fontSize: font.body,
                            color: colors.text,
                            lineHeight: 20,
                            marginBottom: spacing.md,
                        }}>
                            {team.description}
                        </Text>
                    )}

                    {/* 가입 신청 버튼 */}
                    {!isFull && !isCreator && !team.membersList?.includes(user.email) && (
                        <TouchableOpacity
                            onPress={alreadyRequested ? undefined : handleJoin}
                            disabled={isFull || alreadyRequested}
                            style={{
                                backgroundColor: isFull || alreadyRequested ? colors.border : colors.primary,
                                paddingVertical: spacing.sm,
                                borderRadius: radius.md,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: spacing.xs,
                            }}
                        >
                            <Ionicons name="person-add-outline" size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: font.body, fontWeight: '600' }}>
                                {isFull ? '모집마감' : alreadyRequested ? '가입 신청 완료' : '가입 신청'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 일정 및 투표 섹션 */}
                <View style={{ 
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    marginTop: spacing.md,
                }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: spacing.sm,
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ 
                                fontSize: font.body,
                                fontWeight: 'bold',
                                color: colors.text,
                            }}>
                                다음 모임 일정
                            </Text>
                            {scheduleDate ? (
                                <Text style={{ 
                                    fontSize: font.body,
                                    color: colors.text,
                                    marginTop: 4,
                                }}>
                                    {scheduleDate} (D{(() => {
                                        const today = new Date();
                                        const target = new Date(scheduleDate);
                                        const diff = Math.ceil((target.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                                        return diff >= 0 ? `-${diff}` : `+${Math.abs(diff)}`;
                                    })()})
                                </Text>
                            ) : (
                                <Text style={{ 
                                    fontSize: font.body,
                                    color: colors.subtext,
                                    marginTop: 4,
                                }}>
                                    일정 미정
                                </Text>
                            )}
                        </View>
                        {isCreator && (
                            <TouchableOpacity 
                                onPress={() => setDatePickerVisible(true)}
                                style={{
                                    backgroundColor: colors.primary + '20',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: radius.md,
                                }}
                            >
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                    {scheduleDate ? '일정 변경' : '일정 정하기'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {scheduleDate && team.membersList?.includes(user?.email) && (
                        <View style={{ marginTop: spacing.sm }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                                <Text style={{ 
                                    fontSize: font.body,
                                    color: colors.text,
                                    flex: 1,
                                }}>
                                    참석 여부 ({Object.keys(votes).length}명 투표)
                                </Text>
                                {myVote && (
                                    <TouchableOpacity 
                                        onPress={() => setShowVoteStatus(true)}
                                        style={{
                                            backgroundColor: colors.primary + '20',
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: radius.md,
                                        }}
                                    >
                                        <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                            전체 현황
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {myVote ? (
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                    <View style={{
                                        flex: 1,
                                        backgroundColor: colors.surface,
                                        borderRadius: radius.md,
                                        padding: spacing.sm,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                    }}>
                                        <Text style={{ 
                                            fontSize: font.caption,
                                            color: colors.text,
                                            textAlign: 'center',
                                        }}>
                                            내 투표: {
                                                myVote === 'yes' ? '✅ 참석' :
                                                myVote === 'maybe' ? '🤔 미정' :
                                                '❌ 불참'
                                            }
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setVoteModalVisible(true)}
                                        style={{
                                            backgroundColor: colors.primary,
                                            borderRadius: radius.md,
                                            padding: spacing.sm,
                                            paddingHorizontal: spacing.md,
                                        }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: '600' }}>
                                            다시 투표
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => setVoteModalVisible(true)}
                                    style={{
                                        backgroundColor: colors.primary,
                                        borderRadius: radius.md,
                                        padding: spacing.sm,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '600' }}>
                                        참석 여부 투표하기
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* 공지사항이 있는 경우에만 표시 */}
                {team.announcement && (
                    <View style={{ 
                        marginTop: spacing.lg,
                        padding: spacing.md,
                        backgroundColor: colors.primary + '10',
                        borderRadius: radius.md,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.primary,
                    }}>
                        <Text style={{ 
                            fontSize: font.caption,
                            color: colors.primary,
                            fontWeight: '600',
                            marginBottom: 4,
                        }}>
                            공지사항
                        </Text>
                        <Text style={{ 
                            fontSize: font.body,
                            color: colors.text,
                            lineHeight: 20,
                        }}>
                            {team.announcement}
                        </Text>
                    </View>
                )}

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

                <Modal
                    visible={isVoteModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setVoteModalVisible(false)}
                >
                    <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                    }}>
                        <View style={{
                            width: '80%',
                            backgroundColor: colors.surface,
                            borderRadius: radius.lg,
                            padding: spacing.lg,
                        }}>
                            <Text style={{
                                fontSize: font.body,
                                fontWeight: 'bold',
                                color: colors.text,
                                marginBottom: spacing.md,
                                textAlign: 'center',
                            }}>
                                {scheduleDate ? `${scheduleDate} 참석 여부` : '일정 투표'}
                            </Text>

                            {!showVoteStatus ? (
                                <>
                                    {/* 투표 옵션 */}
                                    {[
                                        { status: 'yes' as VoteStatus, label: '가능', icon: '✅' },
                                        { status: 'maybe' as VoteStatus, label: '미정', icon: '🤔' },
                                        { status: 'no' as VoteStatus, label: '불가능', icon: '❌' },
                                    ].map((option) => (
                                        <TouchableOpacity
                                            key={option.status}
                                            onPress={() => setSelectedVote(option.status)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingVertical: spacing.sm,
                                                paddingHorizontal: spacing.md,
                                                marginBottom: spacing.sm,
                                                backgroundColor: selectedVote === option.status ? colors.primary + '20' : 'transparent',
                                                borderRadius: radius.md,
                                                borderWidth: 1,
                                                borderColor: selectedVote === option.status ? colors.primary : colors.border,
                                            }}
                                        >
                                            <View style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: 12,
                                                borderWidth: 2,
                                                borderColor: selectedVote === option.status ? colors.primary : colors.border,
                                                marginRight: spacing.md,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}>
                                                {selectedVote === option.status && (
                                                    <View style={{
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: 6,
                                                        backgroundColor: colors.primary,
                                                    }} />
                                                )}
                                            </View>
                                            <Text style={{
                                                fontSize: font.body,
                                                color: colors.text,
                                                marginRight: spacing.sm,
                                            }}>
                                                {option.icon}
                                            </Text>
                                            <Text style={{
                                                fontSize: font.body,
                                                color: colors.text,
                                            }}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}

                                    {/* 투표하기 버튼 */}
                                    <TouchableOpacity
                                        onPress={() => selectedVote && handleVote(selectedVote)}
                                        disabled={!selectedVote}
                                        style={{
                                            backgroundColor: selectedVote ? colors.primary : colors.border,
                                            paddingVertical: spacing.md,
                                            borderRadius: radius.md,
                                            alignItems: 'center',
                                            marginTop: spacing.md,
                                        }}
                                    >
                                        <Text style={{
                                            color: selectedVote ? '#fff' : colors.subtext,
                                            fontWeight: 'bold',
                                        }}>
                                            투표하기
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={{ 
                                        fontSize: font.caption,
                                        color: colors.subtext,
                                        marginBottom: spacing.md,
                                        textAlign: 'center',
                                    }}>
                                        총 {Object.keys(votes).length}명 참여
                                    </Text>

                                    <VoteStatusBar 
                                        status="✅ 참석 가능" 
                                        count={calculateVoteStats().yes}
                                        total={calculateVoteStats().total}
                                        color={colors.success}
                                    />
                                    <VoteStatusBar 
                                        status="🤔 미정" 
                                        count={calculateVoteStats().maybe}
                                        total={calculateVoteStats().total}
                                        color={colors.warning}
                                    />
                                    <VoteStatusBar 
                                        status="❌ 불참" 
                                        count={calculateVoteStats().no}
                                        total={calculateVoteStats().total}
                                        color={colors.error}
                                    />

                                    {/* 투표자 명단 */}
                                    <View style={{ marginTop: spacing.lg }}>
                                        <Text style={{ 
                                            fontSize: font.body,
                                            fontWeight: 'bold',
                                            color: colors.text,
                                            marginBottom: spacing.sm,
                                        }}>
                                            투표자 명단
                                        </Text>
                                        <ScrollView style={{ maxHeight: 200 }}>
                                            {Object.values(votes).map((vote) => (
                                                <View 
                                                    key={vote.userId}
                                                    style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                        paddingVertical: spacing.xs,
                                                    }}
                                                >
                                                    <Text style={{ color: colors.text }}>{vote.userName}</Text>
                                                    <Text style={{ color: colors.text }}>
                                                        {vote.status === 'yes' ? '✅ 참석' : 
                                                         vote.status === 'maybe' ? '🤔 미정' : '❌ 불참'}
                                                    </Text>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* 다시 투표하기 버튼 */}
                                    <TouchableOpacity
                                        onPress={() => setShowVoteStatus(false)}
                                        style={{
                                            backgroundColor: colors.primary,
                                            paddingVertical: spacing.sm,
                                            borderRadius: radius.md,
                                            alignItems: 'center',
                                            marginTop: spacing.md,
                                        }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>다시 투표하기</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* 닫기 버튼 */}
                            <TouchableOpacity
                                onPress={() => {
                                    setVoteModalVisible(false);
                                    setSelectedVote(null);
                                    setShowVoteStatus(false);
                                }}
                                style={{
                                    paddingVertical: spacing.sm,
                                    alignItems: 'center',
                                    marginTop: spacing.sm,
                                }}
                            >
                                <Text style={{ color: colors.subtext }}>닫기</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* 일정 선택 모달 */}
                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                    onConfirm={handleDateConfirm}
                    onCancel={() => setDatePickerVisible(false)}
                    minimumDate={new Date()} // 오늘 이후의 날짜만 선택 가능
                />

                {/* 장소 선택 모달 */}
                <Modal
                    visible={isLocationModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setLocationModalVisible(false)}
                >
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <TouchableWithoutFeedback onPress={() => setLocationModalVisible(false)}>
                            <View style={{ 
                                flex: 1, 
                                backgroundColor: 'rgba(0,0,0,0.5)', 
                                justifyContent: 'flex-end' 
                            }}>
                                <TouchableWithoutFeedback>
                                    <View style={{
                                        backgroundColor: colors.surface,
                                        borderTopLeftRadius: radius.lg,
                                        borderTopRightRadius: radius.lg,
                                        maxHeight: '80%',
                                    }}>
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: spacing.lg,
                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                            borderBottomColor: colors.border,
                                        }}>
                                            <Text style={{ 
                                                fontSize: font.heading,
                                                fontWeight: 'bold',
                                                color: colors.text,
                                            }}>
                                                장소 선택
                                            </Text>
                                            <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                                                <Ionicons name="close" size={24} color={colors.text} />
                                            </TouchableOpacity>
                                        </View>

                                        <ScrollView 
                                            style={{ maxHeight: '100%' }}
                                            contentContainerStyle={{ padding: spacing.lg }}
                                            keyboardShouldPersistTaps="handled"
                                        >
                                            {/* 직접 입력 */}
                                            <View style={{ marginBottom: spacing.lg }}>
                                                <Text style={{ 
                                                    fontSize: font.body,
                                                    color: colors.text,
                                                    marginBottom: spacing.sm,
                                                }}>
                                                    직접 입력
                                                </Text>
                                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                                    <TextInput
                                                        value={locationInput}
                                                        onChangeText={setLocationInput}
                                                        placeholder="장소를 입력하세요"
                                                        style={{
                                                            flex: 1,
                                                            borderWidth: 1,
                                                            borderColor: colors.border,
                                                            borderRadius: radius.sm,
                                                            padding: spacing.sm,
                                                            color: colors.text,
                                                            backgroundColor: colors.background,
                                                        }}
                                                        placeholderTextColor={colors.subtext}
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() => handleUpdateLocation(locationInput)}
                                                        disabled={!locationInput.trim()}
                                                        style={{
                                                            backgroundColor: locationInput.trim() ? colors.primary : colors.border,
                                                            paddingHorizontal: spacing.lg,
                                                            justifyContent: 'center',
                                                            borderRadius: radius.sm,
                                                        }}
                                                    >
                                                        <Text style={{ color: '#fff' }}>저장</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {/* 자주 사용하는 장소 */}
                                            <View>
                                                <Text style={{ 
                                                    fontSize: font.body,
                                                    color: colors.text,
                                                    marginBottom: spacing.sm,
                                                }}>
                                                    자주 사용하는 장소
                                                </Text>
                                                <View style={{ 
                                                    flexDirection: 'row', 
                                                    flexWrap: 'wrap',
                                                    gap: spacing.sm,
                                                }}>
                                                    {commonLocations.map((location) => (
                                                        <TouchableOpacity
                                                            key={location}
                                                            onPress={() => handleUpdateLocation(location)}
                                                            style={{
                                                                backgroundColor: colors.background,
                                                                paddingHorizontal: spacing.md,
                                                                paddingVertical: spacing.sm,
                                                                borderRadius: radius.sm,
                                                                borderWidth: 1,
                                                                borderColor: colors.border,
                                                            }}
                                                        >
                                                            <Text style={{ color: colors.text }}>{location}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>

                                            {/* 추후 지도 선택 기능 추가 예정 */}
                                            <TouchableOpacity
                                                style={{
                                                    marginTop: spacing.xl,
                                                    marginBottom: Platform.OS === 'ios' ? spacing.xl * 2 : spacing.xl,
                                                    padding: spacing.md,
                                                    backgroundColor: colors.background,
                                                    borderRadius: radius.md,
                                                    borderWidth: 1,
                                                    borderColor: colors.border,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    opacity: 0.5,
                                                }}
                                            >
                                                <Ionicons name="map" size={20} color={colors.text} style={{ marginRight: spacing.sm }} />
                                                <Text style={{ color: colors.text }}>지도에서 선택 (준비중)</Text>
                                            </TouchableOpacity>
                                        </ScrollView>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </Modal>

                {/* 멤버 리스트 */}
                {memberUsers.length > 0 && (
                    <View style={{
                        backgroundColor: colors.surface,
                        borderRadius: radius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.lg,
                    }}>
                        <Text style={{
                            fontSize: font.body,
                            fontWeight: '600',
                            color: colors.text,
                            marginBottom: spacing.md,
                        }}>
                            🙋 참여자 ({memberUsers.length}명)
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
                                        marginBottom: spacing.sm,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{
                                            color: member.email === team.leaderEmail ? colors.primary : colors.text,
                                            fontWeight: member.email === team.leaderEmail ? 'bold' : 'normal',
                                            fontSize: font.body,
                                        }}>
                                            {member.email === team.leaderEmail && '👑 '}
                                            {member.name}
                                        </Text>
                                    </View>

                                    {/* 강퇴 버튼 (모임장만 보임) */}
                                    {isCreator && member.email !== user.email && (
                                        <TouchableOpacity 
                                            onPress={() => handleKick(member.email)}
                                            style={{
                                                backgroundColor: colors.error + '20',
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: radius.md,
                                            }}
                                        >
                                            <Text style={{ color: colors.error, fontSize: font.caption }}>강퇴</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                        {/* 탈퇴하기 버튼 (모임장이 아닌 멤버만 보임) */}
                        {!isCreator && team.membersList?.includes(user?.email) && (
                            <TouchableOpacity
                                onPress={() => {
                                    Alert.alert(
                                        '모임 탈퇴',
                                        '정말 모임을 탈퇴하시겠습니까?',
                                        [
                                            { text: '취소', style: 'cancel' },
                                            {
                                                text: '탈퇴',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    try {
                                                        const teamRef = doc(db, 'teams', team.id);
                                                        await updateDoc(teamRef, {
                                                            membersList: arrayRemove(user.email),
                                                            members: increment(-1),
                                                        });
                                                        showToast('✅ 모임에서 탈퇴했습니다.');
                                                        router.back();
                                                    } catch (error) {
                                                        console.error('탈퇴 실패:', error);
                                                        showToast('⚠️ 탈퇴에 실패했습니다.');
                                                    }
                                                },
                                            },
                                        ]
                                    );
                                }}
                                style={{
                                    marginTop: spacing.md,
                                    paddingVertical: spacing.sm,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                    backgroundColor: colors.error + '10',
                                }}
                            >
                                <Text style={{ color: colors.error, fontSize: font.body }}>
                                    모임 탈퇴하기
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* 하단 버튼 영역 */}
                <View style={{ gap: spacing.md }}>
                    {/* 관리자 버튼 */}
                    {isCreator && (
                        <>
                            <TouchableOpacity
                                onPress={openEditModal}
                                style={{
                                    backgroundColor: colors.primary,
                                    paddingVertical: spacing.md,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
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
                                }}
                            >
                                <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>
                                    🗑️ 모임 삭제하기
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* 가입 신청 버튼 */}
                    {!isFull && !isCreator && !team.membersList?.includes(user.email) && (
                        <TouchableOpacity
                            onPress={alreadyRequested ? undefined : handleJoin}
                            disabled={isFull || alreadyRequested}
                            style={{
                                backgroundColor: isFull || alreadyRequested ? colors.border : colors.primary,
                                paddingVertical: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: font.body, fontWeight: '600' }}>
                                {isFull ? '모집마감' : alreadyRequested ? '가입 신청 완료' : '가입 신청하기'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
