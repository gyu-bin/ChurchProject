import { CAMPUS_ENUM, DEPARTMENT_ENUM } from '@/app/constants/CampusDivisions';
import { formatFirebaseTimestamp } from '@/app/utils/formatFirebaseTimestamp';
import CommentSection from '@/components/department/detail/comment/CommentSection';
import UserInitializer from '@/components/user/UserInitializer';
import { User } from '@/constants/_types/user';
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import { useEffectOnce } from '@/hooks/utils/useEffectOnce';
import ScreenContainer from '@components/_common/ScreenContainer';
import ScreenHeader from '@components/_common/ScreenHeader';
import PostCarousel from '@components/department/_common/PostCarousel';
import { DepartmentPost } from '@components/department/main/list/useGetDepartmentPost';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import LikeButton from '../../../components/department/_common/LikeButton';

/**
 * @page 부서 게시물 상세 페이지
 */
export default function DepartmentPostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useDesign();

  const [post, setPost] = useState<DepartmentPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const fetchPost = useCallback(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const postRef = doc(db, 'department_posts', id);
    const unsubscribe = onSnapshot(
      postRef,
      (postDoc: any) => {
        if (postDoc.exists()) {
          const postData = {
            id: postDoc.id,
            ...postDoc.data(),
          } as DepartmentPost;
          setPost(postData);
        } else {
          setError('게시물을 찾을 수 없습니다.');
        }
        setLoading(false);
      },
      (err: any) => {
        console.error('게시물 가져오기 실패:', err);
        setError('게시물을 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    );

    // Return cleanup function
    return unsubscribe;
  }, [id]);

  useEffectOnce(() => {
    if (id) {
      const unsubscribe = fetchPost();
      return unsubscribe;
    }
  });

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
    <ScreenContainer scrollRef={scrollRef} paddingHorizontal={0}>
      <UserInitializer setUserInfo={setUserInfo} />
      <ScreenHeader title='게시물 상세' hasBackButton paddingHorizontal={20} />
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
          {userInfo && post.author.id === userInfo.email && (
            <EditButton
              onPress={() =>
                router.push(`/department/create/CreateDepartmentPostPage?postId=${post.id}`)
              }>
              <Ionicons name='pencil-outline' size={16} color={colors.text} />
            </EditButton>
          )}
        </AuthorContainer>
        <PostCarousel post={post} />

        <ContentContainer>
          <ContentText>{post.content}</ContentText>
        </ContentContainer>

        <ActionsContainer>
          <LikeButton post={post} userInfo={userInfo} />
        </ActionsContainer>
      </ScrollView>
      <CommentSection post={post} />
    </ScreenContainer>
  );
}

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
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.card};
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.border};
`;

const EditButton = styled.TouchableOpacity`
  padding: ${({ theme }) => theme.spacing.sm}px;
`;
