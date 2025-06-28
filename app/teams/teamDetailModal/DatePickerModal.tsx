import React from 'react';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {writeBatch, doc, collection, getDocs, query, updateDoc, setDoc, where} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { showToast } from '@/utils/toast';
import {Platform} from "react-native";

type Schedule = {
  date: string;
  createdAt: number;
  createdBy: string;
  creatorName: string;
  status: 'active' | 'cancelled';
};

type DatePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  membersList: string[];
  leaderEmail: string;
  user: any;
  onDateSelected: (date: string) => void;
};

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  teamId,
  teamName,
  membersList,
  leaderEmail,
  user,
  onDateSelected
}) => {
  const handleDateConfirm = async (date: Date) => {
    if (!teamId || !user) return;

    const newDate = date.toISOString().slice(0, 10); // YYYY-MM-DD
    await handleScheduleUpdate(newDate);
    onClose();
  };

  const handleScheduleUpdate = async (newDate: string) => {
    if (!teamId || !user) return;

    try {
      // 1. 팀 문서 업데이트
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        scheduleDate: newDate,
        lastScheduleUpdate: Date.now(),
      });

      // 2. 스케줄 컬렉션에 새로운 일정 추가
      const scheduleRef = doc(collection(db, 'teams', teamId, 'schedules'));
      const scheduleData: Schedule = {
        date: newDate,
        createdAt: Date.now(),
        createdBy: user.email,
        creatorName: user.name,
        status: 'active',
      };
      await setDoc(scheduleRef, scheduleData);

      onDateSelected(newDate);

      // 3. 기존 투표 데이터 초기화
      const votesRef = collection(db, 'teams', teamId, 'scheduleVotes');
      const votesSnapshot = await getDocs(votesRef);
      const batch = writeBatch(db);
      votesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // 4. 모임원들에게 알림 전송
      if (!membersList) return;

      const emails = membersList.filter(email => email !== leaderEmail);
      if (emails.length > 0) {
        const tokenQueryBatches = [];
        const emailClone = [...emails];

        while (emailClone.length) {
          const batch = emailClone.splice(0, 10);
          tokenQueryBatches.push(
            query(collection(db, 'expoTokens'), where('email', 'in', batch))
          );
        }

        const tokenSnapshots = await Promise.all(tokenQueryBatches.map(q => getDocs(q)));
        const tokens = tokenSnapshots.flatMap(snap =>
          snap.docs.map(doc => doc.data().token).filter(Boolean)
        );

        if (tokens.length > 0) {
          await sendPushNotification({
            to: tokens,
            title: `📅 ${teamName} 모임 일정 안내`,
            body: `모임 일정이 ${newDate}로 정해졌어요! 참석 여부를 투표해주세요.`,
          });
        }

        const notificationPromises = emails.map(email =>
          sendNotification({
            to: email,
            message: `${teamName} 모임의 일정이 ${newDate}로 정해졌습니다.`,
            type: 'schedule_update',
            link: `/teams/${teamId}`,
            teamId: teamId,
            teamName: teamName,
            scheduleDate: newDate,
          })
        );
        await Promise.all(notificationPromises);
      }

      showToast('✅ 일정이 저장되었습니다.');
    } catch (e) {
      console.error('❌ 일정 저장 실패:', e);
      showToast('⚠️ 일정 저장에 실패했습니다.');
    }
  };

  return (
    <DateTimePickerModal
      isVisible={visible}
      mode="date"
      display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
      onConfirm={handleDateConfirm}
      onCancel={onClose}
      minimumDate={new Date()}
    />
  );
};

export default DatePickerModal;
