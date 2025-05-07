import { Tabs } from 'expo-router';

export default function DivisionLayout() {
    return (
        <Tabs>
            <Tabs.Screen name="index" options={{ title: '홈',headerShown: false }} />
            <Tabs.Screen name="photos" options={{ title: '사진' }} />
            <Tabs.Screen name="board" options={{ title: '게시판' }} />
        </Tabs>
    );
}
