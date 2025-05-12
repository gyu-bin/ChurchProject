//department/[campus]/[division]/layout.tsx
import { Stack } from 'expo-router';

export default function CampusLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="board" />
            <Stack.Screen name="photos" />
        </Stack>
    );
}
