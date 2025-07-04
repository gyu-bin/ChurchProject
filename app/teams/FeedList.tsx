import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDesign } from '@/context/DesignSystem';

export default function CommunityScreen() {
    const { colors, font } = useDesign();

    return (
        <View style={styles.container}>
            <Text style={[styles.text, { color: colors.text, fontSize: font.heading }]}>
                커뮤니티 기능은 준비 중입니다 🚧
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontWeight: 'bold',
    },
});
