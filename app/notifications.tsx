// ✅ app/notifications.tsx
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection, getDocs, query, where, doc,
    updateDoc, deleteDoc, arrayUnion, increment, onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const router = useRouter();

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

        const q = query(
            collection(db, 'notifications'),
            where('to', '==', user.email),
            // 최신순 정렬
            // orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(list); // 🔥 이 줄이 누락되어 있었음
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
        console.log('🔥 승인 동작 시작', approve, selectedNotification);
        console.log(selectedNotification?.teamId,selectedNotification?.applicantEmail);

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
                Alert.alert('✅ 승인 완료', `${selectedNotification.applicantName}님이 소모임에 가입되었습니다.`);
            } else {
                Alert.alert('❌ 거절 처리됨', `${selectedNotification.applicantName}님의 신청을 거절했습니다.`);
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
        <View style={styles.container}>
            <Text style={styles.title}>📢 알림 ({notifications.length})</Text>
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleNotificationPress(item)} style={styles.item}>
                        <Text style={styles.message}>{item.message}</Text>
                        {item.createdAt?.seconds && (
                            <Text style={styles.date}>
                                {format(new Date(item.createdAt.seconds * 1000), 'yyyy-MM-dd HH:mm')}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>알림이 없습니다.</Text>}
            />

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>가입 승인 요청</Text>
                        <Text style={{ marginBottom: 12 }}>
                            {selectedNotification?.applicantName}님이 "{selectedNotification?.teamName}" 모임에 가입을 신청했습니다.
                        </Text>
                        <TouchableOpacity onPress={() => handleApproval(true)} style={styles.modalButton}>
                            <Text style={styles.modalButtonText}>승인하기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleApproval(false)} style={[styles.modalButton, { backgroundColor: '#ddd' }]}>
                            <Text style={{ fontWeight: 'bold' }}>거절하기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    item: {
        backgroundColor: '#f3f4f6',
        padding: 16,
        borderRadius: 10,
        marginBottom: 12,
    },
    message: { fontSize: 16, marginBottom: 4 },
    date: { fontSize: 12, color: '#888' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 12,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    modalButton: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#2563eb',
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
