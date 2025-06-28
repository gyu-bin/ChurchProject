import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function NotFoundScreen() {
  const { user } = useAuth();

  useEffect(() => {
    // 사용자가 로그인한 경우 홈으로 이동
    if (user) {
      router.replace('/(tabs)/home');
    } else {
      // 사용자가 로그인하지 않은 경우 인트로 화면으로 이동
      router.replace('/intro');
    }
  }, [user]);

  // 리다이렉트 되는 동안 로딩 표시
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
