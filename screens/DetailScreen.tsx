// app/catechism.tsx
import { View, Text, Button } from 'react-native';
import { Stack, useRouter } from 'expo-router';

export default function HomeScreen() {
    const router = useRouter();

    return (
        <>
            <Stack.Screen options={{ title: '홈' }} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginBottom: 20 }}>디테일</Text>
                {/*<Button title="교리문답 보기" onPress={() => router.push('')} />*/}
            </View>
        </>
    );
}
