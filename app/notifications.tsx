import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Modal, Alert, SafeAreaView
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

export default function NotificationsScreen() {
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const router = useRouter();

    const { colors, spacing, font, radius } = useDesign();
    const { mode } = useAppTheme();

    useEffect(() => {
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) {
                const currentUser = JSON.parse(raw);
                setUser(currentUser);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'notifications'), where('to', '==', user.email));
        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(list);
        });

        return () => unsubscribe();
    }, [user]);

    const handleNotificationPress = (notification: any) => {
        if (notification.type === 'team_join_request') {
            setSelectedNotification(notification);
            setModalVisible(true);
        } else if (notification.link) {
            router.push(notification.link);
            deleteDoc(doc(db, 'notifications', notification.id));
        }
    };

    const handleApproval = async (approve: boolean) => {
        if (!selectedNotification?.teamId || !selectedNotification?.applicantEmail) {
            Alert.alert('오류', '알림 데이터가 올바르지 않습니다.');
            return;
        }

        try {
            const firestorePromises: Promise<void>[] = [];
            const pushPromises: Promise<void>[] = [];

            if (approve) {
                const teamRef = doc(db, 'teams', selectedNotification.teamId);
                await updateDoc(teamRef, {
                    membersList: arrayUnion(selectedNotification.applicantEmail),
                    members: increment(1),
                });

                firestorePromises.push(sendNotification({
                    to: selectedNotification.applicantEmail,
                    message: `"${selectedNotification.teamName}" 모임에 가입이 승인되었습니다.`,
                    type: 'team_join_approved',
                    link: '/teams',
                }));

                const tokenSnap = await getDocs(query(
                    collection(db, 'expoTokens'),
                    where('email', '==', selectedNotification.applicantEmail)
                ));

                if (!tokenSnap.empty) {
                    const token = tokenSnap.docs[0].data().token;
                    pushPromises.push(sendPushNotification({
                        to: token,
                        title: '🙌 가입 승인 완료',
                        body: `"${selectedNotification.teamName}" 모임에 가입되었어요.`,
                    }));
                }

                Alert.alert('✅ 승인 완료', `${selectedNotification.applicantName}님이 소모임에 가입되었습니다.`);
            }

            await Promise.all([...firestorePromises, ...pushPromises]);

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
            <Text style={{ fontSize: font.heading, fontWeight: 'bold', marginBottom: spacing.md, color: colors.text }}>
                📢 알림 ({notifications.length})
            </Text>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleNotificationPress(item)}
                        style={{
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            borderRadius: radius.md,
                            marginBottom: spacing.sm,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Text style={{ fontSize: font.body, color: colors.text }}>{item.message}</Text>
                        {item.createdAt?.seconds && (
                            <Text style={{ fontSize: font.caption, color: colors.subtext }}>
                                {format(new Date(item.createdAt.seconds * 1000), 'yyyy-MM-dd HH:mm')}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.subtext }}>알림이 없습니다.</Text>}
            />

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.4)',
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
                        <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md }}>
                            가입 승인 요청
                        </Text>
                        <Text style={{ color: colors.text, marginBottom: spacing.md }}>
                            {selectedNotification?.applicantName}님이 "{selectedNotification?.teamName}" 모임에 가입을 신청했습니다.
                        </Text>
                        <TouchableOpacity
                            onPress={() => handleApproval(true)}
                            style={{
                                backgroundColor: colors.primary,
                                paddingVertical: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                                marginBottom: spacing.sm,
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>승인하기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleApproval(false)}
                            style={{
                                backgroundColor: colors.border,
                                paddingVertical: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontWeight: 'bold', color: colors.text }}>거절하기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
