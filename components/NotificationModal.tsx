import React, { useEffect, useState } from 'react';
import {
    Modal, View, Text, FlatList, Switch, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { getDocs, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationModalProps {
    visible: boolean;
    onClose: () => void;
}

interface Device {
    id: string;
    deviceName?: string;
    platform?: string;
    notificationsEnabled?: boolean;
}

export default function NotificationModal({ visible, onClose }: NotificationModalProps) {
    const [devices, setDevices] = useState<Device[]>([]);

    const fetchDevices = async () => {
        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) return;
        const { email } = JSON.parse(raw);

        const snapshot = await getDocs(collection(db, `devices/${email}/tokens`));
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Device[];

        setDevices(list);
    };

    const handleToggleNotification = async (id: string, value: boolean) => {
        const raw = await AsyncStorage.getItem('currentUser');
        if (!raw) return;
        const { email } = JSON.parse(raw);

        try {
            await updateDoc(doc(db, `devices/${email}/tokens/${id}`), {
                notificationsEnabled: value,
            });

            setDevices(prev => prev.map(d =>
                d.id === id ? { ...d, notificationsEnabled: value } : d
            ));
        } catch (err) {
            Alert.alert('오류', '알림 설정을 변경할 수 없습니다.');
        }
    };

    useEffect(() => {
        if (visible) fetchDevices();
    }, [visible]);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.title}>🔔 기기별 알림 설정</Text>
                    <FlatList
                        data={devices}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.itemRow}>
                                <Text>{item.deviceName ?? '알 수 없는 기기'}</Text>
                                <Switch
                                    value={item.notificationsEnabled ?? true}
                                    onValueChange={(value) => handleToggleNotification(item.id, value)}
                                />
                            </View>
                        )}
                    />
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeText}>닫기</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '85%', maxHeight: '80%' },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    closeBtn: { marginTop: 20, backgroundColor: '#2563eb', padding: 10, borderRadius: 8, alignItems: 'center' },
    closeText: { color: '#fff', fontWeight: 'bold' }
});
