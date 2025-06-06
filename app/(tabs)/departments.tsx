// screens/DepartmentsScreen.tsx

import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
const CAMPUS_DIVISIONS: Record<string, string[]> = {
    신촌캠퍼스: ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'],
    문래캠퍼스: ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'],
    시선교회: ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'],
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function DepartmentsScreen() {
    const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
    const router = useRouter();
    const { mode } = useAppTheme();
    const { colors, font, spacing, radius } = useDesign();
    const isDark = mode === 'dark';

    const slideX = useRef(new Animated.Value(0)).current;

    const campuses = Object.keys(CAMPUS_DIVISIONS);

    const insets = useSafeAreaInsets();

    const handleCampusSelect = (campus: string) => {
        Animated.timing(slideX, {
            toValue: -SCREEN_WIDTH,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setSelectedCampus(campus));
    };

    const handleBack = () => {
        Animated.timing(slideX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setSelectedCampus(null));
    };

    const handleDivisionSelect = (division: string) => {
        if (!selectedCampus) return;
        router.push({
            pathname: '/department/[campus]/[division]',
            params: { campus: selectedCampus, division },
        });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background,paddingTop: Platform.OS === 'android' ? insets.top : 0}}>
            <Animated.View
                style={[
                    styles.slideContainer,
                    { width: SCREEN_WIDTH * 2, transform: [{ translateX: slideX }] },
                ]}
            >
                {/* 캠퍼스 선택 화면 */}
                <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: colors.background }]}>
                    <Text style={[styles.title, { color: colors.text }]}>📍 캠퍼스를 선택하세요</Text>
                    {campuses.map(campus => (
                        <TouchableOpacity
                            key={campus}
                            onPress={() => handleCampusSelect(campus)}
                            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                            <Text style={[styles.cardText, { color: colors.text }]}>{campus}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 부서 선택 화면 */}
                <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 80 :20 }]}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Text style={{ color: colors.primary, fontWeight: '600' }}>← 캠퍼스 선택으로 돌아가기</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>🏫 {selectedCampus} 부서를 선택하세요</Text>
                    <FlatList
                        data={selectedCampus ? CAMPUS_DIVISIONS[selectedCampus] : []}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => handleDivisionSelect(item)}
                                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            >
                                <Text style={[styles.cardText, { color: colors.text }]}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slideContainer: {
        flexDirection: 'row',
        flex: 1,
    },
    page: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 24,
        textAlign: 'center',
    },
    card: {
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 14,
        marginBottom: 14,
        borderWidth: 1,
        alignSelf: 'center',
        width: '90%',
    },
    cardText: {
        fontSize: 17,
        fontWeight: '500',
        textAlign: 'center',
    },
    backButton: {
        marginBottom: 16,
        alignItems: 'center',
    },
});
