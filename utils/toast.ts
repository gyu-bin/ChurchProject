// utils/toast.ts
import Toast from 'react-native-root-toast';

export const showToast = (message: string) => {
    Toast.show(message, {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
    });
};
