import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc } from 'firebase/firestore';

export async function registerPushToken() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('푸시 알림 권한 거부됨');
        return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log('✅ Expo Push Token:', token);

    const raw = await AsyncStorage.getItem('currentUser');
    if (raw) {
        const user = JSON.parse(raw);
        const userRef = doc(db, 'users', user.email);
        await updateDoc(userRef, { expoPushToken: token });
    }
}


//교역자는 승인없어도 모임 만들수있게 해주고, 지금 모임 개설할때 인원 적는거 없어졌어. 그리고 교역자가 모임 승인하기 누르면 '승인되었습니다'뜨면서
//그 항목은 사라지게 해줘.
