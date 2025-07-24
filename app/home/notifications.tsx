import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { useNotifications } from '@/hooks/useNotifications';
import { useUpdateTeam } from '@/hooks/useTeams';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { showToast } from "@/utils/toast";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { router } from 'expo-router';
import {
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDocs,
    increment,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform, RefreshControl,
    SafeAreaView,
    Text, TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Toast from 'react-native-root-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeListView } from 'react-native-swipe-list-view';

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
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const openedRowRef = useRef<any>(null); // ✅ 열린 row 추적
    const insets = useSafeAreaInsets();
    const { colors, spacing, font, radius } = useDesign();
    const { mode } = useAppTheme();
    const horizontalPadding = 20;

    // TanStack Query 훅 사용
    const { data: notificationsData = [], isLoading, refetch: refetchNotifications } = useNotifications(user?.email || '');
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    // useNotifications에서 받아온 데이터를 상태에 동기화
    useEffect(() => {
        setNotifications(notificationsData);
    }, [notificationsData]);
    const updateTeamMutation = useUpdateTeam();

    useEffect(() => {
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) setUser(JSON.parse(raw));
        };
        loadUser();
    }, []);

    const onRefresh = useCallback(async () => {
        if (!user) return;
        setRefreshing(true);
        await refetchNotifications();
        setRefreshing(false);
    }, [user, refetchNotifications]);

    // 알림 삭제 후 화면에서도 즉시 제거하는 함수
    const removeNotification = (id: string) => {
        if (!Array.isArray(notifications)) return;
        // notifications가 배열이 아닐 경우 방어
        if (typeof setNotifications === 'function') {
            setNotifications((prev: any[]) => prev.filter((n) => n.id !== id));
        }
    };

    const handleNotificationPress = async (notification: NotificationItem) => {
        try {
            if (notification.type === 'team_join_request') {
                setSelectedNotification(notification);
                setModalVisible(true);
                return;
            }
            if (notification.type === 'open_meditation_ranking') {
                router.push({
                    pathname: "/components/pages/home/DailyBible",
                    params: { showRanking: 'true' }
                } as any);
                await deleteDoc(doc(db, 'notifications', notification.id));
                removeNotification(notification.id); // 화면에서도 즉시 제거
                return;
            }
        } catch (e) {
            console.error('❌ 알림 처리 오류:', e);
        }
    };

    const handleApproval = async (approve: boolean) => {
        if (!selectedNotification?.teamId || !selectedNotification?.applicantEmail) {
            Alert.alert('오류', '알림 데이터가 올바르지 않습니다.');
            return;
        }
        try {
            if (approve) {
                // ✅ 직접 updateDoc 사용하여 members 필드 확실히 업데이트
                const teamRef = doc(db, 'teams', selectedNotification.teamId);
                await updateDoc(teamRef, {
                    membersList: arrayUnion(selectedNotification.applicantEmail),
                    members: increment(1),
                });

                await sendNotification({
                    to: selectedNotification.applicantEmail,
                    message: `"${selectedNotification.teamName}" 모임에 가입이 승인되었습니다.`,
                    type: 'team_join_approved',
                    teamId: selectedNotification.teamId,
                    teamName: selectedNotification.teamName,
                    applicantEmail: selectedNotification.applicantEmail,
                    applicantName: selectedNotification.applicantName,
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

                showToast(`✅ 승인 완료: ${selectedNotification.applicantName}님이 소모임에 가입되었습니다.`);
                // ✅ 알림 목록 최신화
                await refetchNotifications();
                router.push({
                    pathname: '/teams/[id]',
                    params: { id: selectedNotification.teamId }
                });
            }

            await deleteDoc(doc(db, 'notifications', selectedNotification.id));
            removeNotification(selectedNotification.id); // 화면에서도 즉시 제거
            setModalVisible(false);
            setSelectedNotification(null);
        } catch (e) {
            console.error('❌ 승인 처리 에러:', e);
            Alert.alert('오류', '처리에 실패했습니다.');
        }
    };

    const renderItem = ({ item }: { item: NotificationItem }) => (
        <TouchableOpacity
            onPress={() => handleNotificationPress(item)}
            style={{
                backgroundColor: colors.surface,
                padding: spacing.md,
                borderRadius: radius.lg,
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
                <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text }}>
                    {item.message}
                </Text>
                {item.createdAt?.seconds && (
                    <Text style={{
                        fontSize: font.caption,
                        color: colors.subtext,
                        marginTop: 4
                    }}>
                        {format(new Date(item.createdAt.seconds * 1000), 'yyyy-MM-dd HH:mm')}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderHiddenItem = ({ item }: { item: NotificationItem }) => (
        <View style={{ alignItems: 'flex-end', flex: 1, marginBottom: spacing.md }}>
            <TouchableOpacity
                onPress={async () => {
                    try {
                        await deleteDoc(doc(db, 'notifications', item.id));
                        removeNotification(item.id); // 화면에서도 즉시 제거
                        Toast.show('🗑️ 삭제 완료', {
                            duration: Toast.durations.SHORT,
                            position: Toast.positions.BOTTOM,
                            backgroundColor: colors.error,
                            textColor: '#fff',
                        });
                    } catch (e) {
                        console.error('❌ 삭제 실패:', e);
                        Alert.alert('오류', '삭제에 실패했습니다.');
                    }
                }}
                style={{
                    backgroundColor: colors.error,
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: 80,
                    height: '100%',
                    borderRadius: radius.lg,
                }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>삭제</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                height: 56,
                justifyContent: 'center',
                position: 'relative',
                paddingHorizontal: horizontalPadding,
                marginTop: Platform.OS === 'android' ? insets.top : 0,
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ position: 'absolute', left: horizontalPadding, zIndex: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: font.heading, fontWeight: '600', color: colors.text }}>
                    알림
                </Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={() => {
                    openedRowRef.current?.closeRow();
                    Keyboard.dismiss();
                }}>
                    <SwipeListView
                        data={notifications}
                        keyExtractor={(item) => item.id}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        onRowOpen={(rowKey, rowMap) => {
                            if (openedRowRef.current && openedRowRef.current !== rowMap[rowKey]) {
                                openedRowRef.current.closeRow();
                            }
                            openedRowRef.current = rowMap[rowKey]; // 🔥 이걸 안 쓰면 row를 추적 못함
                        }}
                        onTouchStart={() => {
                            if (openedRowRef.current) {
                                openedRowRef.current.closeRow();
                                openedRowRef.current = null;
                            }
                        }}
                        renderItem={renderItem}
                        renderHiddenItem={renderHiddenItem}
                        leftOpenValue={0}
                        rightOpenValue={-80}
                        disableRightSwipe
                        closeOnRowBeginSwipe={false}
                        closeOnRowPress={true}
                        keyboardShouldPersistTaps="handled" // ✅ 꼭 추가
                        ListEmptyComponent={
                            <Text style={{
                                textAlign: 'center',
                                color: colors.subtext,
                                paddingTop: Platform.OS === 'android' ? 20 : 10,
                                fontSize: 20,
                            }}>
                                알림이 없습니다.
                            </Text>
                        }
                    />
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            {/* 승인 모달 */}
            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <View style={{
                        width: '85%',
                        backgroundColor: colors.surface,
                        padding: spacing.lg,
                        borderRadius: radius.lg,
                        elevation: 5,
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text }}>
                                가입 승인 요청
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={{ fontSize: 22, color: colors.subtext }}>✖️</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={{
                            color: colors.text,
                            marginTop: spacing.md,
                            marginBottom: spacing.md,
                            fontSize: font.body
                        }}>
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
