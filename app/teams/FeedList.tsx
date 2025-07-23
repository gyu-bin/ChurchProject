import { useDesign } from '@/context/DesignSystem';
import { setScrollCallback } from '@/utils/scrollRefManager';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/*
const dummyData = Array.from({ length: 12 }, (_, index) => ({
  id: index.toString(),
  likes: 5,
}));
*/

const dummyImageUrls = [
  'https://i.pinimg.com/736x/e3/08/ee/e308eedf0ca6ecacbaae866f2abf81d0.jpg',
  'https://i.pinimg.com/736x/18/98/ba/1898bae9c43122c4ede54d1570fd9982.jpg',
  'https://i.pinimg.com/736x/e5/6b/51/e56b51f0052bcb20364000c4f10b88e3.jpg',
  'https://i.pinimg.com/736x/b6/50/48/b650489faca0b69e3f4681271a9adff2.jpg',
];

// ✅ dummyData 생성 시 랜덤 이미지 추가
const dummyData = Array.from({ length: 39 }, (_, index) => ({
  id: index.toString(),
  likes: Math.floor(Math.random() * 10) + 1, // ❤️ 1~10 랜덤
  image: dummyImageUrls[Math.floor(Math.random() * dummyImageUrls.length)],
}));

export default function CommunityScreen() {
  const { colors, font } = useDesign();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList<any>>(null);
  
  useEffect(() => {
    setScrollCallback('teams', () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, [navigation, flatListRef]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} resizeMode='cover' />
      <View style={styles.likeContainer}>
        <Ionicons name='heart' size={14} color='red' />
        <Text style={styles.likeText}>{item.likes}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ✅ 그리드 카드 */}
      <FlatList
        ref={flatListRef}
        data={dummyData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
      />

      {/* ✅ 플로팅 버튼 */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name='add' size={28} color='#fff' />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#f0f0f0',
  },
  tabText: {
    fontWeight: '600',
  },
  grid: {
    padding: 4,
  },
  card: {
    flex: 1 / 3,
    margin: 4,
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  likeContainer: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeText: {
    marginLeft: 2,
    fontSize: 12,
    color: '#000',
  },
  fab: {
    position: 'absolute',
    bottom: 60,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f48fb1',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  menuBar: {
    height: 50,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
