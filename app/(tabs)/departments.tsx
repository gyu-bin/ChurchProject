import React from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const DEPARTMENTS = [
    {
        title: '신촌캠퍼스',
        data: ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'],
    },
    {
        title: '문래캠퍼스',
        data: ['유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'],
    },
];

export default function DepartmentsScreen() {
    const router = useRouter();

    const handlePress = (campus: string, department: string) => {
        router.push({
            pathname: '/department/[campus]/[division]',
            params: { campus, division: department },
        });
    };

    return (
        <View style={styles.container}>
            <SectionList
                sections={DEPARTMENTS}
                keyExtractor={(item, index) => item + index}
                renderItem={({ item, section }) => (
                    <TouchableOpacity
                        onPress={() => handlePress(section.title, item)}
                        style={styles.item}
                    >
                        <Text style={styles.itemText}>{item}</Text>
                    </TouchableOpacity>
                )}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.header}>{title}</Text>
                )}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 24,
        backgroundColor: '#fff',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        paddingTop: 20,
        paddingBottom: 8,
    },
    item: {
        backgroundColor: '#f3f4f6',
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginVertical: 6,
        borderRadius: 8,
    },
    itemText: {
        fontSize: 16,
    },
});
