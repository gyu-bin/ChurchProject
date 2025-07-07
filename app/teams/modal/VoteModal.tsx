import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
// import { VoteStatus } from '@/types'; // ✅ VoteStatus 타입 정의 위치에 따라 수정
import { Ionicons } from '@expo/vector-icons';

type VoteStatus = 'yes' | 'no' | 'maybe';

type VoteModalProps = {
  visible: boolean;
  onClose: () => void;
  scheduleDate?: string | null;
  votes: Record<string, any>; // ✅ 투표 데이터 타입 정의 필요
  myVote: VoteStatus | null;
  handleVote: (status: VoteStatus) => void;
  showVoteStatus: boolean;
  calculateVoteStats: () => { yes: number; maybe: number; no: number };
  colors: {
    surface: string;
    text: string;
    subtext: string;
    background: string;
    border: string;
    primary: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
  };
  font: {
    body: number;
  };
};

const VoteModal: React.FC<VoteModalProps> = ({
  visible,
  onClose,
  scheduleDate,
  votes,
  myVote,
  handleVote,
  showVoteStatus,
  calculateVoteStats,
  colors,
  spacing,
  radius,
  font,
}) => {
  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
        <View
          style={{
            width: '80%',
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.lg,
          }}>
          <Text
            style={{
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
              onPress={() => {
                handleVote(option.status);
                onClose();
              }}
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
              }}>
              <View
                style={{
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
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: colors.primary,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: font.body,
                  color: colors.text,
                  marginRight: spacing.sm,
                }}>
                {option.icon}
              </Text>
              <Text
                style={{
                  fontSize: font.body,
                  color: colors.text,
                }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* 투표 현황 */}
          {showVoteStatus && (
            <View style={{ marginTop: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>투표 현황</Text>
                <Text style={{ color: colors.subtext }}>총 {Object.keys(votes).length}명 참여</Text>
              </View>

              <View
                style={{
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
                  <View
                    key={item.status}
                    style={{
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
              <View
                style={{
                  backgroundColor: colors.background,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  maxHeight: 150,
                }}>
                <ScrollView>
                  {Object.values(votes).map((vote: any) => (
                    <View
                      key={vote.userId}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: spacing.xs,
                      }}>
                      <Text style={{ color: colors.text }}>{vote.userName}</Text>
                      <Text style={{ color: colors.text }}>
                        {vote.status === 'yes'
                          ? '✅ 참석'
                          : vote.status === 'maybe'
                            ? '🤔 미정'
                            : '❌ 불참'}
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
            }}>
            <Text style={{ color: colors.subtext }}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default VoteModal;
