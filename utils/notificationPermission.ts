// utils/notificationPermission.ts
import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';

export async function requestNotificationPermission() {
    const { status } = await Notifications.getPermissionsAsync();
    // console.log('현재 알림 권한 상태:', status); // ← 추가

    if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log('요청 후 알림 권한 상태:', newStatus); // ← 추가

        if (newStatus !== 'granted') {
            Alert.alert(
                '알림 권한 요청',
                '📢 알림을 허용하시겠습니까?\n설정에서 알림을 켜주셔야 말씀 알림을 받을 수 있어요.',
                [
                    { text: '취소', style: 'cancel' },
                    {
                        text: '설정으로 이동',
                        onPress: () => {
                            if (Platform.OS === 'ios') {
                                Linking.openURL('app-settings:');
                            } else {
                                Linking.openSettings();
                            }
                        },
                    },
                ]
            );
        }
    }
}
