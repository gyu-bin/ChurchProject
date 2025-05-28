// services/pushTokenService.ts
import { db } from '@/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const savePushTokenToFirestore = async (token: string) => {
    const userRaw = await AsyncStorage.getItem('currentUser');
    if (!userRaw) return;

    const { email } = JSON.parse(userRaw);
    const deviceId = `${Device.modelName}-${Device.osName}-${Device.osVersion}`;

    await setDoc(doc(db, `devices/${email}/tokens/${deviceId}`), {
        token,
        updatedAt: new Date().toISOString(),
    });
};
