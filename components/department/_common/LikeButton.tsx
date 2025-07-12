import { DepartmentPost } from '@/components/department/main/list/useGetDepartmentPost';
import { User } from '@/constants/_types/user';
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { Alert, Pressable } from 'react-native';
import styled from 'styled-components/native';

type LikeButtonProps = {
  post: DepartmentPost;
  userInfo: User | null;
};

export default function LikeButton({ post, userInfo }: LikeButtonProps) {
  const { colors } = useDesign();
  
  // Use actual post data instead of local state
  const liked = post.likes?.includes(userInfo?.email || '') || false;
  const likeCount = post.likes?.length || 0;

  const handleLike = async () => {
    if (!post || !userInfo) return;

    try {
      const postRef = doc(db, 'department_posts', post.id);

      if (liked) {
        await updateDoc(postRef, {
          likes: arrayRemove(userInfo.email),
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userInfo.email),
        });
      }
      
      // No need to update local state - real-time listener will handle it
    } catch (err) {
      console.error('좋아요 처리 실패:', err);
      Alert.alert('오류', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <Pressable onPress={handleLike} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={24}
        color={liked ? '#ff4757' : colors.text}
      />
      <ActionText>{likeCount}</ActionText>
    </Pressable>
  );
}

const ActionText = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  margin-left: ${({ theme }) => theme.spacing.sm}px;
`;