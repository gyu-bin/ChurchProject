import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Modal, Alert, SafeAreaView,
    Platform, RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection, getDocs, query, where, doc,
    updateDoc, deleteDoc, arrayUnion, increment, onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import Toast from 'react-native-root-toast'; // 🔹 꼭 설치되어 있어야 함
// ✅ 타입 선언
interface NotificationItem {
    id: string;
    message: string;
    type: string;
    link?: string;
    createdAt?: {
        seconds: number;
        nanoseconds: number;
    };
    teamId?: string;
    teamName?: string;
    applicantEmail?: string;
    applicantName?: string;
}

export default function NotificationsScreen() {
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const router = useRouter();
    const { colors, spacing, font, radius } = useDesign();
    const { mode } = useAppTheme();

    // ✅ 유저 정보 로딩
    useEffect(() => {
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) setUser(JSON.parse(raw));
        };
        loadUser();
    }, []);

    // ✅ 실시간 알림 구독
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'notifications'), where('to', '==', user.email));
        const unsubscribe = onSnapshot(q, (snap) => {
            const list: NotificationItem[] = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as NotificationItem))
                .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
            setNotifications(list);
        });
        return () => unsubscribe();
    }, [user]);

    // ✅ 수동 새로고침
    const onRefresh = useCallback(async () => {
        if (!user) return;
        try {
            setRefreshing(true);
            const q = query(collection(db, 'notifications'), where('to', '==', user.email));
            const snap = await getDocs(q);
            const list: NotificationItem[] = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as NotificationItem))
                .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
            setNotifications(list);
        } catch (e) {
            console.error('🔄 알림 새로고침 실패:', e);
        } finally {
            setRefreshing(false);
        }
    }, [user]);

    // ✅ 알림 클릭 시 이동 또는 모달
    const handleNotificationPress = async (notification: NotificationItem) => {
        if (notification.type === 'team_join_request') {
            setSelectedNotification(notification);
            setModalVisible(true);
            return;
        }

        try {
            if (notification.type === 'team_create') {
                router.push({ pathname: '/pastor/pastor', params: { tab: 'teams' } });
                return;
            }

            if (notification.link === '/pastor/pastor') {
                router.push({ pathname: '/pastor/pastor', params: { tab: 'prayers' } });
                return;
            }

            await deleteDoc(doc(db, 'notifications', notification.id));
        } catch (e) {
            console.error('❌ 라우팅 에러:', e);
        }
    };

    // ✅ 가입 승인 처리
    const handleApproval = async (approve: boolean) => {
        if (!selectedNotification?.teamId || !selectedNotification?.applicantEmail) {
            Alert.alert('오류', '알림 데이터가 올바르지 않습니다.');
            return;
        }

        try {
            if (approve) {
                const teamRef = doc(db, 'teams', selectedNotification.teamId);
                await updateDoc(teamRef, {
                    membersList: arrayUnion(selectedNotification.applicantEmail),
                    members: increment(1),
                });

                await sendNotification({
                    to: selectedNotification.applicantEmail,
                    message: `"${selectedNotification.teamName}" 모임에 가입이 승인되었습니다.`,
                    type: 'team_join_approved',
                    link: '/teams',
                });

                const tokenSnap = await getDocs(query(
                    collection(db, 'expoTokens'),
                    where('email', '==', selectedNotification.applicantEmail)
                ));

                if (!tokenSnap.empty) {
                    const token = tokenSnap.docs[0].data().token;
                    await sendPushNotification({
                        to: token,
                        title: '🙌 가입 승인 완료',
                        body: `"${selectedNotification.teamName}" 모임에 가입되었어요.`,
                    });
                }

                Alert.alert('✅ 승인 완료', `${selectedNotification.applicantName}님이 소모임에 가입되었습니다.`);
                router.replace('/');
            }

            await deleteDoc(doc(db, 'notifications', selectedNotification.id));
            setModalVisible(false);
            setSelectedNotification(null);
        } catch (e) {
            console.error('❌ 승인 처리 에러:', e);
            Alert.alert('오류', '처리에 실패했습니다.');
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleNotificationPress(item)}
                        style={{
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            borderRadius: 12,
                            marginBottom: spacing.md,
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: mode === 'light' ? '#000' : 'transparent',
                            shadowOpacity: 0.05,
                            shadowRadius: 6,
                            elevation: 3,
                        }}
                    >
                        <View style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: mode === 'dark' ? colors.border : '#f1f5f9',
                            justifyContent: 'center', alignItems: 'center',
                            marginRight: spacing.md,
                        }}>
                            <Text style={{ fontSize: 18 }}>📢</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                                {item.message}
                            </Text>
                            {item.createdAt?.seconds && (
                                <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 4 }}>
                                    {format(new Date(item.createdAt.seconds * 1000), 'yyyy-MM-dd HH:mm')}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <Text style={{
                        textAlign: 'center', color: colors.subtext,
                        paddingTop: Platform.OS === 'android' ? 0 : 20,
                        fontSize: 20
                    }}>
                        알림이 없습니다.
                    </Text>
                }
            />

            {/* 가입 승인 모달 */}
            <Modal visible={modalVisible} animationType="fade" transparent>
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.25)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <View
                        style={{
                            width: '85%',
                            backgroundColor: colors.surface,
                            padding: spacing.lg,
                            borderRadius: radius.lg,
                            elevation: 5,
                        }}
                    >
                        {/* ✅ 제목 + 닫기 버튼 가로정렬 */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>
                                가입 승인 요청
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={{ fontSize: 22, color: colors.subtext }}>✖️</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: colors.text, marginTop: spacing.md, marginBottom: spacing.md }}>
                            {selectedNotification?.applicantName}님이 &#34;{selectedNotification?.teamName}&#34; 모임에 가입을 신청했습니다.
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                            <TouchableOpacity
                                onPress={() => {
                                    handleApproval(true);
                                    Toast.show('✅ 승인 완료', {
                                        duration: Toast.durations.SHORT,
                                        position: Toast.positions.BOTTOM,
                                        backgroundColor: colors.primary,
                                        textColor: '#fff',
                                    });
                                }}
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.primary,
                                    paddingVertical: spacing.md,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>✅ 승인</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    handleApproval(false);
                                    Toast.show('❌ 요청이 거절되었습니다.', {
                                        duration: Toast.durations.SHORT,
                                        position: Toast.positions.BOTTOM,
                                        backgroundColor: colors.error,
                                        textColor: '#fff',
                                    });
                                }}
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.error,
                                    paddingVertical: spacing.md,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>❌ 거절</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
