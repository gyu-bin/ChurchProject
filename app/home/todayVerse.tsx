import { verses } from '@/assets/verses';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  // 하루에 하나의 랜덤 말씀 (날짜 기준)
  const todayIdx = useMemo(() => {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return seed % verses.length;
  }, []);
  const verse = verses[todayIdx];
  // 랜덤 배경 (말씀 인덱스 기준)
  const bgIdx = todayIdx % BG_COLORS.length;
  const bg = BG_COLORS[bgIdx];

  return (
    <View style={[styles.container, { backgroundColor: bg[0] }]}> 
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={{ fontSize: 22, color: '#fff' }}>닫기</Text>
      </TouchableOpacity>
      <View style={[styles.card, { backgroundColor: bg[1] }]}> 
        <Text style={styles.title}>오늘의 말씀</Text>
        <Text style={styles.verse}>{verse.verse}</Text>
        <Text style={styles.ref}>{verse.reference}</Text>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
    width: width * 0.85,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 18,
  },
  verse: {
    fontSize: 20,
    color: '#222',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  ref: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
  },
}); 