import { verses } from '@/assets/verses';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef } from 'react';
import {
    ImageBackground,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import ViewShot from 'react-native-view-shot';

const BG_COLORS = [
  ['#a1c4fd', '#c2e9fb'],
  ['#fbc2eb', '#a6c1ee'],
  ['#fddb92', '#d1fdff'],
  ['#f6d365', '#fda085'],
  ['#84fab0', '#8fd3f4'],
  ['#fccb90', '#d57eeb'],
  ['#e0c3fc', '#8ec5fc'],
];

export default function TodayVerse() {
  const router = useRouter();
  const viewShotRef = useRef<ViewShot>(null);

  const todayIdx = useMemo(() => {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return seed % verses.length;
  }, []);

  const verse = verses[todayIdx];
  const bgIdx = todayIdx % BG_COLORS.length;

  const handleShare = async () => {
    if (!viewShotRef.current) return;
    // @ts-ignore
    const uri = await viewShotRef.current.capture();
    await Share.share({ url: uri });
  };

  const handleSave = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return;
    if (!viewShotRef.current) return;

    // @ts-ignore
    const uri = await viewShotRef.current.capture();
    const asset = await MediaLibrary.createAssetAsync(uri);
    await MediaLibrary.createAlbumAsync('Verses', asset, false);
    alert('📸 이미지가 갤러리에 저장되었습니다.');
  };

  const frame = useWindowDimensions();
  const width = frame.width;

  return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={{ fontSize: 22, color: '#fff' }}>닫기</Text>
        </TouchableOpacity>

        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={{ alignItems: 'center' }}>
          <ImageBackground
              source={require('@/assets/intro.jpeg')}
              style={[styles.card]}
              imageStyle={{ borderRadius: 28 }}
              resizeMode={'cover'}
          >
            <Text style={styles.title}>오늘의 말씀</Text>
            <Text style={styles.verse}>{verse.verse}</Text>
            <Text style={styles.ref}>{verse.reference}</Text>
          </ImageBackground>
        </ViewShot>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Text style={styles.actionText}>공유하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
            <Text style={styles.actionText}>저장하기</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#222',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 10,
    backgroundColor: '#00000033',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  card: {
    width: '85%', // 카드 너비 크게
    height: 600, // 카드 높이 크게
    borderRadius: 28,
    padding: 40, // 여유 있게 padding
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

// ⬇ 텍스트 스타일도 비례적으로 키움
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  verse: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  ref: {
    fontSize: 15,
    color: '#ddd',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  actionBtn: {
    backgroundColor: '#ffffff33',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
