import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection, getDocs, query, where, doc,
    updateDoc, deleteDoc, arrayUnion, increment
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

    const fetchNotifications = async () => {
        if (!user) return;
        const q = query(collection(db, 'notifications'), where('to', '==', user.email));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => {
            const data = doc.data();
            // console.log('📥 알림 읽어오기:', data);  // 🔍 확인 포인트
            return {
                id: doc.id,
                ...data,
            };
        });
        setNotifications(list);
    };

    useEffect(() => {
        const load = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) {
                const currentUser = JSON.parse(raw);
                setUser(currentUser);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (user) fetchNotifications();
    }, [user]);

    const handleNotificationPress = (notification: any) => {
        console.log('🔍 알림 내용:', notification); // 👈 로그 추가

        if (notification.type === 'team_join_request') {
            setSelectedNotification(notification);
            setModalVisible(true);
        } else if (notification.link) {
            router.push(notification.link);
            deleteDoc(doc(db, 'notifications', notification.id));
            fetchNotifications();
        }
    };

    const handleApproval = async () => {
        if (
            !selectedNotification?.teamId ||
            !selectedNotification?.applicantEmail ||
            !selectedNotification?.teamName
        ) {
            Alert.alert('오류', '알림 데이터가 올바르지 않습니다.');
            console.log(selectedNotification?.teamId,selectedNotification?.applicantEmail,selectedNotification?.teamName )
            return;
        }

        try {
            const teamRef = doc(db, 'teams', selectedNotification.teamId);
            await updateDoc(teamRef, {
                membersList: arrayUnion(selectedNotification.applicantEmail),
                members: increment(1), // 🔥 members 수 증가
            });

            await deleteDoc(doc(db, 'notifications', selectedNotification.id));

            Alert.alert('✅ 승인 완료', `${selectedNotification.applicantName}님이 소모임에 가입되었습니다.`);
            setModalVisible(false);
            setSelectedNotification(null);
            fetchNotifications();
        } catch (e) {
            console.error(e);
            Alert.alert('오류', '가입 승인에 실패했습니다.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📢 알림</Text>
            <FlatList
                data={notifications.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)}
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

            {/* 가입 승인 모달 */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>가입 승인 요청</Text>
                        <Text style={{ marginBottom: 12 }}>
                            {selectedNotification?.applicantName}님이 "{selectedNotification?.teamName}" 모임에 가입을 신청했습니다.
                        </Text>

                        <TouchableOpacity onPress={handleApproval} style={styles.modalButton}>
                            <Text style={styles.modalButtonText}>승인하기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={[styles.modalButton, { backgroundColor: '#ddd' }]}
                        >
                            <Text style={{ fontWeight: 'bold' }}>취소</Text>
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
