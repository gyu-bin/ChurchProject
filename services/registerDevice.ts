// src/services/registerDevice.ts
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const registerDevice = async () => {
    const userRaw = await AsyncStorage.getItem('currentUser');
    if (!userRaw) return;
    const { email } = JSON.parse(userRaw);

    const deviceId = `${Device.modelName}-${Device.osName}-${Device.osVersion}`;
    const deviceName = Device.modelName ?? '이름 없는 기기';

    await setDoc(doc(db, `devices/${email}/tokens/${deviceId}`), {
        deviceId,
        deviceName,
        registeredAt: new Date(),
    });
};
