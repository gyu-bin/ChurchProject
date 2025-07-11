import { CAMPUS_ENUM, DEPARTMENT_ENUM } from '@/app/constants/CampusDivisions';
import { formatFirebaseTimestamp } from '@/app/utils/formatFirebaseTimestamp';
import UserInitializer from '@/components/user/UserInitializer';
import { User } from '@/constants/_types/user';
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { arrayRemove, arrayUnion, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { DepartmentPost } from '../list/useGetDepartmentPost';

const { width: screenWidth } = Dimensions.get('window');

interface Comment {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: Timestamp;
}

/**
 * @page 부서 게시물 상세 페이지
 */
export default function DepartmentPostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useDesign();

  const [post, setPost] = useState<DepartmentPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userInfo, setUserInfo] = useState<User | null>(null);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const postDoc = await getDoc(doc(db, 'department_posts', id));

      if (postDoc.exists()) {
        const postData = {
          id: postDoc.id,
          ...postDoc.data(),
        } as DepartmentPost;
        setPost(postData);
        setLikeCount(postData.likes?.length || 0);
        setComments(postData.comments || []);

        if (userInfo && postData.likes) {
          setLiked(postData.likes.includes(userInfo.email));
        }
      } else {
        setError('게시물을 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error('게시물 가져오기 실패:', err);
      setError('게시물을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo && post) {
      if (post.likes) {
        setLiked(post.likes.includes(userInfo.email));
      }
    }
  }, [userInfo, post]);

  const handleLike = async () => {
    if (!post || !userInfo) return;

    try {
      const postRef = doc(db, 'department_posts', post.id);

      if (liked) {
        await updateDoc(postRef, {
          likes: arrayRemove(userInfo.email),
        });
        setLikeCount((prev) => prev - 1);
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userInfo.email),
        });
        setLikeCount((prev) => prev + 1);
      }

      setLiked(!liked);
    } catch (err) {
      console.error('좋아요 처리 실패:', err);
      Alert.alert('오류', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleComment = async () => {
    if (!post || !userInfo || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        author: {
          id: userInfo.email,
          name: userInfo.name,
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

  const renderImage = ({ item, index }: { item: string; index: number }) => (
    <PostImage source={{ uri: item }} resizeMode='cover' />
  );

  const renderComment = ({ item }: { item: Comment }) => (
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

  if (loading) {
    return (
      <LoadingContainer>
        <ActivityIndicator size='large' color={colors.primary} />
      </LoadingContainer>
    );
  }

  if (error || !post) {
    return (
      <ErrorContainer>
        <Ionicons name='alert-circle-outline' size={48} color={colors.subtext} />
        <ErrorText>{error || '게시물을 찾을 수 없습니다.'}</ErrorText>
        <BackButton onPress={() => router.back()}>
          <BackButtonText>돌아가기</BackButtonText>
        </BackButton>
      </ErrorContainer>
    );
  }

  return (
    <Container>
      <UserInitializer setUserInfo={setUserInfo} />

      <ScrollView style={{ flex: 1 }}>
        <AuthorContainer>
          <AuthorAvatar>
            <AuthorAvatarText>{post.author.name.charAt(0)}</AuthorAvatarText>
          </AuthorAvatar>
          <AuthorInfo>
            <AuthorName>{post.author.name}</AuthorName>
            <AuthorMeta>
              {CAMPUS_ENUM[post.campus]} • {DEPARTMENT_ENUM[post.division]}
            </AuthorMeta>
            <AuthorTimestamp>{formatFirebaseTimestamp(post.createdAt)}</AuthorTimestamp>
          </AuthorInfo>
        </AuthorContainer>

        {post.imageUrls && post.imageUrls.length > 0 && (
          <ImageContainer>
            <FlatList
              data={post.imageUrls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => index.toString()}
              renderItem={renderImage}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setCurrentImageIndex(index);
              }}
            />

            {post.imageUrls.length > 1 && (
              <ImageIndicator>
                <ImageIndicatorText>
                  {currentImageIndex + 1} / {post.imageUrls.length}
                </ImageIndicatorText>
              </ImageIndicator>
            )}
          </ImageContainer>
        )}

        <ContentContainer>
          <ContentText>{post.content}</ContentText>
        </ContentContainer>

        <ActionsContainer>
          <ActionButton onPress={handleLike}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={24}
              color={liked ? '#ff4757' : colors.text}
            />
            <ActionText>{likeCount}</ActionText>
          </ActionButton>

          <ActionButton>
            <Ionicons name='chatbubble-outline' size={24} color={colors.text} />
            <ActionText>{comments.length}</ActionText>
          </ActionButton>
        </ActionsContainer>

        <CommentsContainer>
          <CommentsHeader>
            <CommentsTitle>댓글 ({comments.length})</CommentsTitle>
          </CommentsHeader>

          {comments.length > 0 ? (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              scrollEnabled={false}
            />
          ) : (
            <EmptyCommentsContainer>
              <EmptyCommentsText>아직 댓글이 없습니다.</EmptyCommentsText>
            </EmptyCommentsContainer>
          )}
        </CommentsContainer>
      </ScrollView>

      <CommentInputContainer>
        <CommentInput
          value={newComment}
          onChangeText={setNewComment}
          placeholder='댓글을 입력하세요...'
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
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const ErrorContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.lg}px;
`;

const ErrorText = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  margin-top: ${({ theme }) => theme.spacing.md}px;
  font-size: 16px;
`;

const BackButton = styled.TouchableOpacity`
  margin-top: ${({ theme }) => theme.spacing.lg}px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.md}px;
`;

const BackButtonText = styled.Text`
  color: #fff;
  font-weight: 600;
`;

const AuthorContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.card};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const AuthorAvatar = styled.View`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background-color: ${({ theme }) => theme.colors.primary};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }) => theme.spacing.md}px;
`;

const AuthorAvatarText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 18px;
`;

const AuthorInfo = styled.View`
  flex: 1;
`;

const AuthorName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  font-size: 16px;
`;

const AuthorMeta = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  font-size: 14px;
`;

const AuthorTimestamp = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  font-size: 12px;
`;

const ImageContainer = styled.View`
  position: relative;
`;

const PostImage = styled.Image`
  width: ${screenWidth}px;
  height: ${screenWidth * 1.2}px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const ImageIndicator = styled.View`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md}px;
  right: ${({ theme }) => theme.spacing.md}px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: ${({ theme }) => theme.radius.sm}px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.sm}px;
`;

const ImageIndicatorText = styled.Text`
  color: #fff;
  font-size: 12px;
`;

const ContentContainer = styled.View`
  padding: ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const ContentText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  line-height: 24px;
`;

const ActionsContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.card};
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.border};
`;

const ActionButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin-right: ${({ theme }) => theme.spacing.lg}px;
`;

const ActionText = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  margin-left: ${({ theme }) => theme.spacing.sm}px;
`;

const CommentsContainer = styled.View`
  background-color: ${({ theme }) => theme.colors.card};
  margin-top: ${({ theme }) => theme.spacing.sm}px;
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

const CommentContainer = styled.View`
  flex-direction: row;
  padding-vertical: ${({ theme }) => theme.spacing.sm}px;
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

const CommentAvatarText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 12px;
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
