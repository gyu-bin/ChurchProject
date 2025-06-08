import { useDesign } from '@/app/context/DesignSystem';
import { db } from '@/firebase/config';
import { showToast } from "@/utils/toast";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as Device from 'expo-device';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface DeviceManagerProps {
    visible: boolean;
    onClose: () => void;
}

type DeviceInfo = {
    deviceId: string;
    deviceName: string;
    deviceModel: string;
    platform: string;
    osVersion: string;
    lastUsed: number;
    isCurrentDevice: boolean;
};

export default function DeviceManager({ visible, onClose }: DeviceManagerProps) {
    const [devices, setDevices] = useState<DeviceInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const { colors, font, spacing, radius } = useDesign();

    useEffect(() => {
        if (visible) {
            fetchDevices();
        }
    }, [visible]);

    const fetchDevices = async () => {
        try {
            setLoading(true);
            const userRaw = await AsyncStorage.getItem('currentUser');
            if (!userRaw) return;
            const { email } = JSON.parse(userRaw);

            const tokenQuery = query(collection(db, 'expoTokens'), where('email', '==', email));
            const tokenSnap = await getDocs(tokenQuery);

            const currentDeviceId = `${Device.modelName}-${Device.osName}-${Device.osVersion}`;
            
            const deviceList = tokenSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    deviceId: data.deviceId,
                    deviceName: data.deviceName,
                    deviceModel: data.deviceModel,
                    platform: data.platform,
                    osVersion: data.osVersion,
                    lastUsed: data.lastUsed,
                    isCurrentDevice: data.deviceId === currentDeviceId
                };
            });

            setDevices(deviceList.sort((a, b) => b.lastUsed - a.lastUsed));
        } catch (error) {
            console.error('기기 목록 로딩 실패:', error);
            showToast('⚠️ 기기 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoutDevice = async (deviceId: string) => {
        const userRaw = await AsyncStorage.getItem('currentUser');
        if (!userRaw) return;
        const { email } = JSON.parse(userRaw);

        Alert.alert(
            '기기 로그아웃',
            '해당 기기에서 로그아웃하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '로그아웃',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'expoTokens', deviceId));
                            setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
                            showToast('✅ 기기가 로그아웃되었습니다.');
                        } catch (error) {
                            console.error('기기 로그아웃 실패:', error);
                            showToast('⚠️ 기기 로그아웃에 실패했습니다.');
                        }
                    }
                }
            ]
        );
    };

    const renderDevice = ({ item }: { item: DeviceInfo }) => (
        <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                        name={item.platform === 'ios' ? 'phone-portrait' : 'phone-portrait-outline'}
                        size={20}
                        color={colors.text}
                        style={{ marginRight: spacing.sm }}
                    />
                    <Text style={{
                        fontSize: font.body,
                        color: colors.text,
                        fontWeight: '600',
                    }}>
                        {item.deviceName}
                        {item.isCurrentDevice && (
                            <Text style={{ color: colors.primary }}> (현재 기기)</Text>
                        )}
                    </Text>
                </View>
                <Text style={{
                    fontSize: font.caption,
                    color: colors.subtext,
                    marginTop: 4,
                }}>
                    {item.platform} {item.osVersion}
                </Text>
                <Text style={{
                    fontSize: font.caption,
                    color: colors.subtext,
                    marginTop: 2,
                }}>
                    마지막 사용: {format(new Date(item.lastUsed), 'PPP', { locale: ko })}
                </Text>
            </View>
            {!item.isCurrentDevice && (
                <TouchableOpacity
                    onPress={() => handleLogoutDevice(item.deviceId)}
                    style={{
                        backgroundColor: colors.error + '20',
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: radius.sm,
                    }}
                >
                    <Text style={{ color: colors.error }}>로그아웃</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'flex-end',
            }}>
                <View style={{
                    backgroundColor: colors.background,
                    borderTopLeftRadius: radius.lg,
                    borderTopRightRadius: radius.lg,
                    maxHeight: '80%',
                }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: spacing.lg,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                    }}>
                        <Text style={{
                            fontSize: font.heading,
                            fontWeight: 'bold',
                            color: colors.text,
                        }}>
                            로그인된 기기 관리
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={{
                            padding: spacing.xl,
                            alignItems: 'center',
                        }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={devices}
                            renderItem={renderDevice}
                            keyExtractor={item => item.deviceId}
                            contentContainerStyle={{ padding: spacing.lg }}
                            ListEmptyComponent={
                                <Text style={{
                                    textAlign: 'center',
                                    color: colors.subtext,
                                    padding: spacing.xl,
                                }}>
                                    로그인된 기기가 없습니다.
                                </Text>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
} 