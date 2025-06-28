import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert, Switch,
} from 'react-native';
import { db } from '@/firebase/config';
import {collection, deleteDoc, doc, getDocs, updateDoc} from 'firebase/firestore';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {showToast} from "@/utils/toast";

interface DeviceManagerProps {
    visible: boolean;
    onClose: () => void;
}

export default function DeviceManager({ visible, onClose }: DeviceManagerProps) {
    const [devices, setDevices] = useState<any[]>([]);
    const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

    useEffect(() => {
        const fetch = async () => {
            const userRaw = await AsyncStorage.getItem('currentUser');
            if (!userRaw) return;
            const { email } = JSON.parse(userRaw);

            const snapshot = await getDocs(collection(db, `devices/${email}/tokens`));
            setDevices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };

        const current = `${Device.modelName}-${Device.osName}-${Device.osVersion}`;
        setCurrentDeviceId(current);

        if (visible) fetch();
    }, [visible]);

    const handleLogoutDevice = async (deviceId: string) => {
        const userRaw = await AsyncStorage.getItem('currentUser');
        if (!userRaw) return;
        const { email } = JSON.parse(userRaw);

        Alert.alert('기기 로그아웃', '해당 기기에서 로그아웃하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '로그아웃', style: 'destructive', onPress: async () => {
                    await deleteDoc(doc(db, `devices/${email}/tokens/${deviceId}`));
                    console.log(deviceId)
                    setDevices(prev => prev.filter(d => d.id !== deviceId));
                }
            }
        ]);
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>📱 로그인된 기기 목록</Text>
                    <FlatList
                        data={devices}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.deviceItem}>
                                <Text style={styles.deviceText}>{item.deviceName ?? '이름 없는 기기'}</Text>
                                {item.deviceId === currentDeviceId ? (
                                    <Text style={styles.currentLabel}>현재 기기</Text>
                                ) : (
                                    <TouchableOpacity onPress={() => handleLogoutDevice(item.id)}>
                                        <Text style={styles.logoutText}>로그아웃</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    />

                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>닫기</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        maxHeight: '70%',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    deviceItem: {
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderColor: '#ccc',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    deviceText: {
        fontSize: 16,
    },
    currentLabel: {
        color: 'green',
        fontSize: 14,
    },
    logoutText: {
        color: 'red',
        fontSize: 14,
    },
    closeButton: {
        marginTop: 20,
        backgroundColor: '#2563eb',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
