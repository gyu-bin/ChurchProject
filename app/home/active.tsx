import { db } from '@/firebase/config';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useDesign } from '@/app/context/DesignSystem';

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
  const { colors, spacing, font } = useDesign();
  const [teams, setTeams] = useState<Team[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);

  useFocusEffect(
      useCallback(() => {
        const fetchTeams = async () => {
          const q = query(
              collection(db, 'teams'),
              where('category', '==', '✨ 반짝소모임')
          );
          const snap = await getDocs(q);

          const todayStr = dayjs().format('YYYY-MM-DD');
          const validTeams: Team[] = [];

          for (const docSnap of snap.docs) {
            const raw = docSnap.data() as any;
            const id = docSnap.id;

            let expirationDate = raw.expirationDate;
            if (expirationDate?.toDate) expirationDate = expirationDate.toDate();

            const dueDate =
                expirationDate instanceof Date && !isNaN(expirationDate as any)
                    ? dayjs(expirationDate).format('YYYY-MM-DD')
                    : null;

            if (!dueDate) continue;

            if (dueDate < todayStr) {
              try {
                await deleteDoc(doc(db, 'teams', id));
              } catch (e) {
                console.error(`삭제 실패 (${id}):`, e);
              }
              continue;
            }

            validTeams.push({
              ...raw,
              id,
              dueDate,
              members: raw.members ?? [],
            });
          }

          const sorted = validTeams.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
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
    const end = dayjs(dueDate).startOf('day');
    const diff = end.diff(today, 'day');
    if (diff === 0) return 'D-Day';
    if (diff < 0) return '마감';
    return `D-${diff}`;
  };

  return (
      <View style={{ gap: spacing.lg }}>
        <View style={{ marginBottom: spacing.lg }}>
          <TouchableOpacity onPress={() => router.push('/teams?filter=✨ 반짝소모임')}>
            <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.sm,
                }}
            >
              <Text
                  style={{
                    fontSize: font.title,
                    fontWeight: 'bold',
                    color: colors.text,
                  }}
              >
                ✨ 반짝소모임
              </Text>
              <Text
                  style={{
                    fontSize: font.body,
                    color: colors.text,
                  }}
              >
                더보기
              </Text>
            </View>

          </TouchableOpacity>
          {teams.map((team) => (
              <TouchableOpacity
                  key={team.id}
                  onPress={() => router.push(`/teams/${team.id}`)}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 2,
                  }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text }}>{team.name}</Text>
                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>
                      ~ {dayjs(team.dueDate).format('YYYY.MM.DD')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: 'bold', color: colors.primary }}>{getDDay(team.dueDate)}</Text>
                    <Text style={{ backgroundColor: colors.primary, color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: font.caption }}>
                      모집중
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
          ))}
        </View>

        <View>
          <TouchableOpacity onPress={() => router.push('/share/allPrayer')}>
            <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.sm,
                }}
            >
              <Text
                  style={{
                    fontSize: font.title,
                    fontWeight: 'bold',
                    color: colors.text,
                  }}
              >
                🙏 기도제목
              </Text>
              <Text
                  style={{
                    fontSize: font.body,
                    color: colors.text,
                  }}
              >
                더보기
              </Text>
            </View>
          </TouchableOpacity>

          {prayers.map((prayer) => (
              <View
                  key={prayer.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 2,
                  }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: font.body, color: colors.text, marginBottom: 4 }}>{prayer.title}</Text>
                <Text style={{ fontSize: font.body, color: colors.subtext, marginBottom: 6 }}>{prayer.content}</Text>
                <Text style={{ fontSize: font.caption, color: colors.subtext, textAlign: 'right' }}>{prayer.name}</Text>
              </View>
          ))}
        </View>
      </View>
  );
}
