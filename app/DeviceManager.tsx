import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    Alert,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,Switch
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import {
    collection,
    getDocs,
    deleteDoc,
    doc, updateDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import AsyncStorage from "@react-native-async-storage/async-storage";

type Device = {
    id: string; // 문서 ID (doc.id)
    token: string;
    deviceName?: string;
    platform?: string;
    notificationsEnabled?: boolean;
};
export default function DeviceManager({
                                          visible,
                                          onClose,
                                      }: {
    visible: boolean;
    onClose: () => void;
}) {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();

    const fetchDevices = async () => {
        const user = getAuth().currentUser;
        if (!user) return;
        try {
            const snapshot = await getDocs(collection(db, 'users', user.uid, 'devices'));
            const list = snapshot.docs.map(doc => ({
                token: doc.id,
                ...doc.data()
            })) as Device[];
            setDevices(list);
        } catch (error) {
            Alert.alert('오류', '기기 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const logoutDevice = async (token: string) => {
        const user = getAuth().currentUser;
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'devices', token));
            Alert.alert('로그아웃 완료', '선택한 기기를 로그아웃 처리했습니다.');
            fetchDevices();
        } catch (err) {
            Alert.alert('오류', '기기 로그아웃에 실패했습니다.');
        }
    };

    useEffect(() => {
        if (visible) {
            fetchDevices();
        }
    }, [visible]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    justifyContent: 'flex-end'
                }}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            style={{
                                backgroundColor: '#fff',
                                borderTopLeftRadius: 20,
                                borderTopRightRadius: 20,
                                padding: 20,
                                paddingBottom: insets.bottom + 20,
                                maxHeight: '80%',
                            }}
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>기기 관리</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Text style={{ fontSize: 16, color: '#007aff' }}>닫기</Text>
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={devices}
                                keyExtractor={(item) => item.token}
                                contentContainerStyle={{ paddingTop: 20 }}
                                ListEmptyComponent={
                                    !loading ? (
                                        <Text style={{ textAlign: 'center', color: '#999' }}>등록된 기기가 없습니다.</Text>
                                    ) : null
                                }
                                renderItem={({ item }) => (
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 16,
                                    }}>
                                        <Text>
                                            {item.deviceName ?? '알 수 없음 기기'} ({item.platform ?? 'unknown'})
                                        </Text>
                                        <TouchableOpacity onPress={() => logoutDevice(item.token)}>
                                            <Text style={{ color: 'red', fontWeight: 'bold' }}>로그아웃</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
