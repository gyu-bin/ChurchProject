import { Modal, View, Text, TouchableOpacity } from 'react-native';

export default function ForestShhh({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                }}
            >
                <View
                    style={{
                        backgroundColor: '#fff',
                        padding: 40,
                        borderRadius: 16,
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ fontSize: 28, marginBottom: 12 }}>🤫 쉿…</Text>
                    <Text style={{ textAlign: 'center', lineHeight: 22 }}>
                        여긴 익명 공간이에요.
                        {'\n'}따뜻한 마음을 나누어주세요.
                        {'\n'}비난이나 악성 글은 삭제될 수 있어요.
                    </Text>
                    <TouchableOpacity
                        onPress={onClose}
                        style={{
                            marginTop: 20,
                            backgroundColor: '#007AFF',
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderRadius: 8,
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>시작하기</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
