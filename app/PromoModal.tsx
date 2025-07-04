import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const dummyImageUrls = [
    'https://i.pinimg.com/736x/e3/08/ee/e308eedf0ca6ecacbaae866f2abf81d0.jpg',
    'https://i.pinimg.com/736x/18/98/ba/1898bae9c43122c4ede54d1570fd9982.jpg',
    'https://i.pinimg.com/736x/e5/6b/51/e56b51f0052bcb20364000c4f10b88e3.jpg',
    'https://i.pinimg.com/736x/b6/50/48/b650489faca0b69e3f4681271a9adff2.jpg'
];

export default function PromoModal() {
    const [visible, setVisible] = useState(true); // 테스트용 항상 true
    const [currentIndex, setCurrentIndex] = useState(0);

    const closeModal = async () => {
        setVisible(false);
    };

    const neverShowAgain = async () => {
        await AsyncStorage.setItem('hasSeenPromo', 'true');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={closeModal}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <View
                    style={{
                        width: SCREEN_WIDTH * 0.9,
                        borderRadius: 20,
                        backgroundColor: '#fff',
                        overflow: 'hidden',
                    }}
                >
                    {/* 페이지 인디케이터 */}
                    <View
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            borderRadius: 12,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            zIndex: 10,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 12 }}>
                            {currentIndex + 1} / {dummyImageUrls.length}
                        </Text>
                    </View>

                    {/* 이미지 캐러셀 */}
                    <Carousel
                        loop
                        width={SCREEN_WIDTH * 0.9} // 💥 width 명시
                        height={SCREEN_HEIGHT * 0.5} // 💥 height 명시
                        autoPlay={false}
                        data={dummyImageUrls}
                        scrollAnimationDuration={600}
                        onSnapToItem={(index) => setCurrentIndex(index)}
                        renderItem={({ item }) => (
                            <Image
                                source={{ uri: item }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: '#eee',
                                }}
                                contentFit="cover"
                                transition={500}
                            />
                        )}
                    />

                    {/* 버튼 영역 */}
                    <View
                        style={{
                            flexDirection: 'row',
                            borderTopWidth: 1,
                            borderColor: '#ddd',
                        }}
                    >
                        <TouchableOpacity
                            onPress={neverShowAgain}
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 14,
                                borderRightWidth: 1,
                                borderColor: '#ddd',
                            }}
                        >
                            <Text style={{ color: '#555', fontSize: 15 }}>오늘 그만 보기</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={closeModal}
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 14,
                            }}
                        >
                            <Text style={{ color: '#007AFF', fontSize: 15, fontWeight: '600' }}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
