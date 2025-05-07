import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    Modal,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/firebase/config';
import { collection, getDocs, addDoc } from 'firebase/firestore';

type Team = {
    id: string;
    name: string;
    leader: string;
    members: number;
    thumbnail?: string;
};

export default function TeamsScreen() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [isGrid, setIsGrid] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [leader, setLeader] = useState('');

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        const snapshot = await getDocs(collection(db, 'teams'));
        const loaded: Team[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Team[];
        setTeams(loaded);
    };

    const handleCreateGroup = async () => {
        if (!name || !leader) return alert('모든 값을 입력해주세요.');
        try {
            await addDoc(collection(db, 'teams'), {
                name,
                leader,
                members: 1,
                createdAt: new Date(),
            });
            setModalVisible(false);
            setName('');
            setLeader('');
            fetchTeams();
        } catch (e) {
            console.error('소모임 생성 실패:', e);
        }
    };

    const renderItem = ({ item }: { item: Team }) => (
        <TouchableOpacity style={isGrid ? styles.gridItem : styles.listItem}>
            <Image
                source={{
                    uri: item.thumbnail || 'https://source.unsplash.com/200x200/?community',
                }}
                style={styles.thumbnail}
            />
            <View style={styles.textContainer}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>👤 모임장: {item.leader}</Text>
                <Text style={styles.meta}>👥 인원: {item.members}명</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.toggleRow}>
                <Text style={styles.title}>소그룹 목록</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Ionicons name="add-circle" size={24} color="#4287f5" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsGrid(!isGrid)}>
                        <Ionicons name={isGrid ? 'list' : 'grid'} size={24} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={teams}
                key={isGrid ? 'g' : 'l'}
                numColumns={isGrid ? 2 : 1}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={isGrid && { gap: 16 }}
            />

            <Modal visible={modalVisible} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>소모임 생성</Text>
                    <TextInput
                        placeholder="모임명"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="모임장 이름"
                        value={leader}
                        onChangeText={setLeader}
                        style={styles.input}
                    />
                    <TouchableOpacity onPress={handleCreateGroup} style={styles.submitButton}>
                        <Text style={styles.submitText}>신청하기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                        <Text style={styles.closeText}>닫기</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const screenWidth = Dimensions.get('window').width;
const gridItemWidth = (screenWidth - 60) / 2;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 24,
    },
    gridItem: {
        width: gridItemWidth,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    listItem: {
        flexDirection: 'row',
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
        gap: 12,
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginBottom: 8,
    },
    textContainer: {
        flexShrink: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    meta: {
        fontSize: 14,
        color: '#666',
    },
    modalContainer: {
        flex: 1,
        padding: 24,
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    submitButton: {
        backgroundColor: '#4287f5',
        padding: 14,
        alignItems: 'center',
        borderRadius: 8,
        marginBottom: 12,
    },
    submitText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    closeButton: {
        alignItems: 'center',
        padding: 10,
    },
    closeText: {
        color: '#333',
    },
});
