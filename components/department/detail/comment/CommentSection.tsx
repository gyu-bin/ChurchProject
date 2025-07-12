import { formatFirebaseTimestamp } from '@/app/utils/formatFirebaseTimestamp';
import { useDesign } from '@/context/DesignSystem';
import { useCurrentUser } from '@/context/UserContext';
import { db } from '@/firebase/config';
import { arrayUnion, doc, Timestamp, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList } from 'react-native';
import styled from 'styled-components/native';
import { DepartmentPost } from '../../main/list/useGetDepartmentPost';

interface Comment {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: Timestamp;
}

export default function CommentSection({ post }: { post: DepartmentPost }) {
  const { user } = useCurrentUser();
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const { colors } = useDesign();

  const handleComment = async () => {
    if (!post || !user || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        author: {
          id: user.email,
          name: user.name,
        },
        createdAt: Timestamp.now(),
      };

      const postRef = doc(db, 'department_posts', post.id);
      await updateDoc(postRef, {
        comments: arrayUnion(comment),
      });

      setComments((prev) => [comment, ...prev]);
      setNewComment('');
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      Alert.alert('오류', '댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <>
      <CommentsContainer>
        <CommentsHeader>
          <CommentsTitle>댓글 ({comments.length})</CommentsTitle>
        </CommentsHeader>

        {Boolean(comments.length) ? (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <_Comment item={item} />}
            scrollEnabled={false}
          />
        ) : (
          <EmptyCommentsContainer>
            <EmptyCommentsText>아직 댓글이 없습니다.</EmptyCommentsText>
          </EmptyCommentsContainer>
        )}
      </CommentsContainer>
      <CommentInputContainer>
        <CommentInput
          value={newComment}
          onChangeText={setNewComment}
          placeholder='댓글을 입력하세요...'
          placeholderTextColor={colors.subtext}
          multiline
        />
        <SubmitButton onPress={handleComment} disabled={!newComment.trim() || submittingComment}>
          {submittingComment ? (
            <ActivityIndicator size='small' color='#fff' />
          ) : (
            <SubmitButtonText>전송</SubmitButtonText>
          )}
        </SubmitButton>
      </CommentInputContainer>
    </>
  );
}

function _Comment({ item }: { item: Comment }) {
  return (
    <CommentContainer>
      <CommentAvatar>
        <CommentAvatarText>{item.author.name.charAt(0)}</CommentAvatarText>
      </CommentAvatar>
      <CommentContent>
        <CommentHeader>
          <CommentAuthorName>{item.author.name}</CommentAuthorName>
          <CommentTimestamp>{formatFirebaseTimestamp(item.createdAt)}</CommentTimestamp>
        </CommentHeader>
        <CommentText>{item.text}</CommentText>
      </CommentContent>
    </CommentContainer>
  );
}

const CommentsContainer = styled.View`
  background-color: ${({ theme }) => theme.colors.card};
  padding: ${({ theme }) => theme.spacing.sm}px 0;
`;

const CommentsHeader = styled.View`
  padding: ${({ theme }) => theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const CommentsTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  font-size: 16px;
`;

const EmptyCommentsContainer = styled.View`
  padding: ${({ theme }) => theme.spacing.lg}px;
  align-items: center;
`;

const EmptyCommentsText = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  font-size: 14px;
`;

const CommentInputContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.card};
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.border};
`;

const CommentInput = styled.TextInput`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  margin-right: ${({ theme }) => theme.spacing.sm}px;
  color: ${({ theme }) => theme.colors.text};
  ::placeholder {
    color: ${({ theme }) => theme.colors.subtext};
  }
`;

const SubmitButton = styled.TouchableOpacity<{ disabled: boolean }>`
  background-color: ${({ theme, disabled }) =>
    disabled ? theme.colors.border : theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
`;

const SubmitButtonText = styled.Text`
  color: #fff;
  font-weight: 600;
`;

const CommentAvatarText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 12px;
`;

const CommentContainer = styled.View`
  flex-direction: row;
  padding: ${({ theme }) => theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const CommentAvatar = styled.View`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.primary};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }) => theme.spacing.sm}px;
`;

const CommentContent = styled.View`
  flex: 1;
`;

const CommentHeader = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 4px;
`;

const CommentAuthorName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  font-size: 14px;
`;

const CommentTimestamp = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  font-size: 12px;
  margin-left: ${({ theme }) => theme.spacing.sm}px;
`;

const CommentText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  line-height: 20px;
`;
