import { CAMPUS_ENUM, DEPARTMENT_ENUM } from '@/app/constants/CampusDivisions';
import { formatFirebaseTimestamp } from '@/app/utils/formatFirebaseTimestamp';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Dimensions, View } from 'react-native';
import styled from 'styled-components/native';
import PostCarousel from '../../_common/PostCarousel';
import { DepartmentPost } from './useGetDepartmentPost';
import LikeButton from '../../_common/LikeButton';
import { useCurrentUser } from '@/context/UserContext';

const { width: screenWidth } = Dimensions.get('window');
const POST_WIDTH = screenWidth - 32;

export default function CardPost({ item }: { item: DepartmentPost }) {
  const { colors } = useDesign();
  const { user } = useCurrentUser();
  const hasImages = item.imageUrls && item.imageUrls.length > 0;

  const handlePress = () => {
    router.push(`/department/detail/${item.id}`);
  };

  return (
    <CardContainer onPress={handlePress}>
      <HeaderContainer>
        <AvatarContainer>
          <AvatarText>{item.author.name.charAt(0)}</AvatarText>
        </AvatarContainer>
        <AuthorInfo>
          <AuthorName>{item.author.name}</AuthorName>
          <AuthorMeta>
            {CAMPUS_ENUM[item.campus]} • {DEPARTMENT_ENUM[item.division]}
          </AuthorMeta>
        </AuthorInfo>
        <Timestamp>{formatFirebaseTimestamp(item.createdAt)}</Timestamp>
      </HeaderContainer>

      {hasImages && <PostCarousel post={item} />}

      <ContentContainer>
        <ContentText numberOfLines={3}>{item.content || '내용이 없습니다'}</ContentText>
      </ContentContainer>

      <FooterContainer>
        <View>
          <LikeButton post={item} userInfo={user} />
        </View>
        <CommentContainer>
          <Ionicons name='chatbubble-outline' size={20} color={colors.text} />
          <CommentCount>{item.comments?.length || 0}</CommentCount>
        </CommentContainer>
      </FooterContainer>
    </CardContainer>
  );
}

const CardContainer = styled.Pressable`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
  overflow: hidden;
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const AvatarContainer = styled.View`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.primary};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }) => theme.spacing.sm}px;
`;

const AvatarText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 14px;
`;

const AuthorInfo = styled.View`
  flex: 1;
`;

const AuthorName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  font-size: 14px;
`;

const AuthorMeta = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  font-size: 12px;
`;

const Timestamp = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  font-size: 12px;
`;

const ContentContainer = styled.View`
  width: ${POST_WIDTH}px;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg}px;
`;

const ContentText = styled.Text`
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  flex-wrap: wrap;
`;

const FooterContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.border};
`;

const CommentContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const CommentCount = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  font-size: 12px;
  margin-left: 4px;
`;
