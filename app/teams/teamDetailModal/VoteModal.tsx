import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useDesign } from '@/context/DesignSystem';
import { showToast } from '@/utils/toast';

type Vote = {
  userId: string;
  userName: string;
  status: VoteStatus;
  timestamp: number;
};

type VoteStats = {
  yes: number;
  no: number;
  maybe: number;
  total: number;
};

type VoteStatus = 'yes' | 'no' | 'maybe';

type VoteModalProps = {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  scheduleDate: string;
  votes: { [key: string]: Vote };
  myVote: VoteStatus | null;
  user: any;
};

const VoteModal: React.FC<VoteModalProps> = ({
  visible,
  onClose,
  teamId,
  scheduleDate,
  votes,
  myVote,
  user
}) => {
  const { colors, font, spacing, radius } = useDesign();
  const [selectedVote, setSelectedVote] = useState<VoteStatus | null>(null);
  const [showVoteStatus, setShowVoteStatus] = useState(true);

  // 투표 통계 계산 함수
  const calculateVoteStats = (): VoteStats => {
    const voteArray = Object.values(votes);
    const total = voteArray.length;
    return {
      yes: voteArray.filter(v => v.status === 'yes').length,
      no: voteArray.filter(v => v.status === 'no').length,
      maybe: voteArray.filter(v => v.status === 'maybe').length,
      total
    };
  };

  // 투표 처리 함수
  const handleVote = async (status: VoteStatus) => {
    if (!teamId || !scheduleDate || !user) return;

    const voteRef = doc(db, 'teams', teamId, 'scheduleVotes', user.email);

    // 같은 걸 눌렀다면 → 삭제
    if (myVote === status) {
      try {
        await deleteDoc(voteRef);
        setSelectedVote(null);
        setShowVoteStatus(false);
        showToast('⛔️ 투표가 취소되었습니다.');
      } catch (e) {
        console.error('❌ 투표 취소 실패:', e);
        showToast('⚠️ 투표 취소 중 문제가 발생했습니다.');
      }
      onClose();
      return;
    }

    try {
      await setDoc(voteRef, {
        userId: user.email,
        userName: user.name,
        status,
        scheduleDate,
        timestamp: Date.now(),
      });

      setSelectedVote(null);
      setShowVoteStatus(true);
      showToast('✅ 투표가 완료되었습니다.');
      onClose();
    } catch (error) {
      console.error('투표 저장 실패:', error);
      showToast('⚠️ 투표 저장에 실패했습니다.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}>
        <View style={{
          width: '80%',
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
        }}>
          <Text style={{
            fontSize: font.body,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: spacing.md,
            textAlign: 'center',
          }}>
            {scheduleDate ? `${scheduleDate} 참석 여부` : '일정 투표'}
          </Text>

          {/* 투표 옵션 */}
          {[
            { status: 'yes' as VoteStatus, label: '가능', icon: '✅' },
            { status: 'maybe' as VoteStatus, label: '미정', icon: '🤔' },
            { status: 'no' as VoteStatus, label: '불가능', icon: '❌' },
          ].map((option) => (
            <TouchableOpacity
              key={option.status}
              onPress={() => handleVote(option.status)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                marginBottom: spacing.sm,
                backgroundColor: myVote === option.status ? colors.primary + '20' : 'transparent',
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: myVote === option.status ? colors.primary : colors.border,
              }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: myVote === option.status ? colors.primary : colors.border,
                marginRight: spacing.md,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {myVote === option.status && (
                  <View style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: colors.primary,
                  }} />
                )}
              </View>
              <Text style={{
                fontSize: font.body,
                color: colors.text,
                marginRight: spacing.sm,
              }}>
                {option.icon}
              </Text>
              <Text style={{
                fontSize: font.body,
                color: colors.text,
              }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}

          {showVoteStatus && (
            <View style={{ marginTop: spacing.md }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: spacing.sm,
              }}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                  투표 현황
                </Text>
                <Text style={{ color: colors.subtext }}>
                  총 {Object.keys(votes).length}명 참여
                </Text>
              </View>

              <View style={{
                backgroundColor: colors.background,
                padding: spacing.sm,
                borderRadius: radius.md,
                marginBottom: spacing.md,
              }}>
                {[
                  { status: 'yes', label: '✅ 참석', count: calculateVoteStats().yes },
                  { status: 'maybe', label: '🤔 미정', count: calculateVoteStats().maybe },
                  { status: 'no', label: '❌ 불참', count: calculateVoteStats().no },
                ].map((item) => (
                  <View key={item.status} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.xs,
                  }}>
                    <Text style={{ color: colors.text }}>{item.label}</Text>
                    <Text style={{ color: colors.text }}>{item.count}명</Text>
                  </View>
                ))}
              </View>

              <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: spacing.sm }}>
                투표자 명단
              </Text>
              <View style={{
                backgroundColor: colors.background,
                padding: spacing.sm,
                borderRadius: radius.md,
                maxHeight: 150,
              }}>
                <ScrollView>
                  {Object.values(votes).map((vote) => (
                    <View
                      key={vote.userId}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: spacing.xs,
                      }}
                    >
                      <Text style={{ color: colors.text }}>{vote.userName}</Text>
                      <Text style={{ color: colors.text }}>
                        {vote.status === 'yes' ? '✅ 참석' :
                          vote.status === 'maybe' ? '🤔 미정' : '❌ 불참'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* 닫기 버튼 */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              paddingVertical: spacing.sm,
              alignItems: 'center',
              marginTop: spacing.sm,
            }}
          >
            <Text style={{ color: colors.subtext }}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default VoteModal;
