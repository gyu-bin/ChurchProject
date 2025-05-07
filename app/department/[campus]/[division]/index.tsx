import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';

export default function DivisionScreen() {
    const { campus, division } = useLocalSearchParams();
    const navigation = useNavigation();

    useLayoutEffect(() => {
        navigation.setOptions({
            title: `${campus} - ${division}`,
        });
    }, [navigation, campus, division]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{campus} - {division}</Text>
            {/*<Text style={styles.subtitle}>{campus}/{division}</Text>*/}

            <TouchableOpacity
                style={styles.button}
                onPress={() => router.push(`/department/${campus}/${division}/photos`)}
            >
                <Text style={styles.buttonText}>📸 사진 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
                onPress={() => router.push(`/department/${campus}/${division}/board`)}
            >
                <Text style={styles.buttonText}>📝 게시판</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#4287f5',
        paddingVertical: 14,
        borderRadius: 10,
        marginBottom: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
