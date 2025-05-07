// app/(tabs)/catechism.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import catechismData from '@/assets/catechism/catechism.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CatechismItem = {
    question_number: number;
    question: string;
    answer: string;
    references?: string[];
};

export default function Catechism() {
    const [selected, setSelected] = useState<number>(1);
    const [modalVisible, setModalVisible] = useState(false);
    const [data, setData] = useState<CatechismItem[]>([]);

    useEffect(() => {
        setData(catechismData);
        loadLastSeen();
    }, []);

    const loadLastSeen = async () => {
        const stored = await AsyncStorage.getItem('last_seen_question');
        if (stored) setSelected(Number(stored));
    };

    const saveLastSeen = async (num: number) => {
        await AsyncStorage.setItem('last_seen_question', num.toString());
    };

    const handleSelect = (num: number) => {
        setSelected(num);
        saveLastSeen(num);
        setModalVisible(false);
    };

    const selectedItem = data.find((item) => item.question_number === selected);

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={styles.selectButton}
            >
                <Text style={styles.selectButtonText}>문항 {selected} ▾</Text>
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>문항 선택</Text>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item.question_number.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => handleSelect(item.question_number)}
                            >
                                <Text style={styles.itemText}>
                                    문 {item.question_number}. {item.question}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.close}>
                        <Text style={styles.closeText}>닫기</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>

            {selectedItem && (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.card}>
                        <Text style={styles.question}>
                            Q{selectedItem.question_number}. {selectedItem.question}
                        </Text>
                        <Text style={styles.answer}>{selectedItem.answer}</Text>

                        {selectedItem.references && selectedItem.references.length > 0 && (
                            <View style={styles.referenceBox}>
                                <Text style={styles.refTitle}>📖 성경 참고 구절:</Text>
                                {selectedItem.references.map((ref, idx) => (
                                    <Text key={idx} style={styles.refItem}>• {ref}</Text>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    selectButton: {
        backgroundColor: '#f0f0f0',
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    selectButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    modalContainer: {
        flex: 1,
        padding: 20,
        marginLeft: 15,
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    item: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    itemText: {
        fontSize: 16,
        color: '#444',
    },
    close: {
        marginTop: 20,
        padding: 14,
        backgroundColor: '#4287f5',
        alignItems: 'center',
        borderRadius: 8,
    },
    closeText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    question: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    answer: {
        fontSize: 16,
        lineHeight: 26,
        color: '#444',
    },
    referenceBox: {
        marginTop: 20,
    },
    refTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 4,
    },
    refItem: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
});
