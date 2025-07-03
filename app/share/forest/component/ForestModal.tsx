import { Modal, View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useState } from 'react';
import { db } from '@/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ForestModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
    const [content, setContent] = useState('');

    const handleSubmit = async () => {
        if (!content.trim()) return;
        await addDoc(collection(db, 'forest_posts'), {
            content,
            createdAt: serverTimestamp(),
        });
        setContent('');
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
                    <Text style={{ fontSize: 16, marginBottom: 10 }}>📝 익명 글 작성</Text>
                    <TextInput
                        multiline
                        scrollEnabled={true} // ✅ 내부 스크롤 가능
                        textAlignVertical="top" // ✅ 내용이 위에서부터 시작
                        value={content}
                        onChangeText={setContent}
                        placeholder="하고 싶은 말을 적어주세요"
                        placeholderTextColor="#999" // 👉 placeholder 색상도 추가
                        style={{
                            borderColor: '#ccc',
                            borderWidth: 1,
                            padding: 10,
                            borderRadius: 6,
                            minHeight: 100, // ✅ 최소 높이
                            maxHeight: 400, // ✅ 최대 높이
                            color: '#000',   // ✅ 입력 텍스트 색상
                        }}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={{ marginRight: 10 }}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSubmit}>
                            <Text style={{ color: '#007AFF' }}>작성</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
