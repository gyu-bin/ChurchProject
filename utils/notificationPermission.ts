import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

export async function requestNotificationPermission() {
    try {
        // 시뮬레이터 체크
        if (!Device.isDevice) {
            console.log('📱 시뮬레이터에서는 푸시 알림을 사용할 수 없습니다.');
            return;
        }

        // Android 13 이상에서는 시스템 권한만 요청
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                return;
            }
        }
        // iOS나 이전 버전 Android에서는 Expo 권한만 요청
        else {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                const { status: newStatus } = await Notifications.requestPermissionsAsync();
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
    } catch (error) {
        console.error('알림 권한 요청 실패:', error);
    }
}
