// components/home/Active.tsx
import { db } from '@/firebase/config';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { router, useNavigation } from 'expo-router';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Team {
  id: string;
  name: string;
  dueDate: string;
  members: any[];
  maxMembers: number;
}

interface PrayerRequest {
  id: string;
  title: string;
  content: string;
  name: string;
  createdAt: any;
}

export default function ActiveSection() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const fetchTeams = async () => {
        const q = query(
          collection(db, 'teams'),
          where('category', '==', '✨ 반짝소모임'),
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => {
          const raw = doc.data() as Team;
          return {
            ...raw,
            id: doc.id,
            members: raw.members ?? [],
          };
        });
        const sorted = data.sort((a, b) => {
          const aDate = new Date(a.dueDate).getTime();
          const bDate = new Date(b.dueDate).getTime();
          return bDate - aDate;
        });
        setTeams(sorted.slice(0, 2));
      };
  
      const fetchPrayers = async () => {
        const q = query(collection(db, 'prayer_requests'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrayerRequest));
        setPrayers(data.slice(0, 2));
      };
  
      fetchTeams();
      fetchPrayers();
    }, [])
  );

  const getDDay = (dueDate: string) => {
    const today = dayjs().startOf('day');
    const end = dayjs(dueDate);
    const diff = end.diff(today, 'day');
    return diff >= 0 ? `D-Day` : `마감`;
  };

  return (
    <View style={{ gap: 28 }}>
      {/* 반짝소모임 섹션 */}
      <View>
        <TouchableOpacity
          onPress={() => router.push('/teams?filter=✨ 반짝소모임')}
        >
          <Text style={styles.sectionTitle}>✨ 반짝소모임</Text>
        </TouchableOpacity>

        {teams.map(team => (
  <TouchableOpacity
    key={team.id}
    style={styles.card}
    onPress={() => router.push(`/teams/${team.id}`)}
  >
    <View style={{ flex: 1 }}>
      <Text style={styles.cardTitle}>{team.name || '모임명 없음'}</Text>
      <Text style={styles.cardSub}>~ {dayjs(team.dueDate).format('YYYY.MM.DD')}</Text>
    </View>
    <View style={styles.tagContainer}>
      <Text style={styles.dDay}>{getDDay(team.dueDate)}</Text>
      <Text style={styles.status}>모집중</Text>
    </View>
  </TouchableOpacity>
))}
      </View>

      {/* 기도제목 섹션 */}
      <View>
      <TouchableOpacity
          onPress={() => router.push('/share/allPrayer')}
        >
          <Text style={styles.sectionTitle}>🙏 기도제목</Text>
        </TouchableOpacity>
        {prayers.map(prayer => (
          <View key={prayer.id} style={styles.prayerBox}>
            <Text style={styles.prayerTitle}>{prayer.title}</Text>
            <Text style={styles.prayerContent}>{prayer.content}</Text>
            <Text style={styles.prayerAuthor}>{prayer.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111', // 보기 좋게 텍스트 색 추가
  },
  cardSub: {
    color: '#666',
    fontSize: 13,
  },
  tagContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dDay: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  status: {
    backgroundColor: '#2563eb',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 12,
    overflow: 'hidden',
  },
  prayerBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  prayerTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  prayerContent: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
  },
  prayerAuthor: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
});