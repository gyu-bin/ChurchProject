import { CAMPUS_ENUM, DEPARTMENT_ENUM } from '@/app/constants/CampusDivisions';
import { formatFirebaseTimestamp } from '@/app/utils/formatFirebaseTimestamp';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Dimensions } from 'react-native';
import styled from 'styled-components/native';
import { DepartmentPost } from './useGetDepartmentPost';

const { width: screenWidth } = Dimensions.get('window');
const POST_WIDTH = screenWidth - 32;
const IMAGE_HEIGHT = POST_WIDTH * 1.2;

export default function CardPost({ item }: { item: DepartmentPost }) {
  const { colors } = useDesign();
  const hasImages = item.imageUrls && item.imageUrls.length > 0;
  const hasMultipleImages = hasImages && item.imageUrls.length > 1;

  const handlePress = () => {
    router.push(`/department/detail/${item.id}`);
  };

  return (
    <CardContainer onPress={handlePress} activeOpacity={0.8}>
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

      {hasImages && (
        <ImageContainer>
          <PostImage source={{ uri: item.imageUrls[0] }} resizeMode='cover' />
          {hasMultipleImages && (
            <ImageBadge>
              <Ionicons name='images' size={16} color='#fff' />
              <ImageCount>{item.imageUrls.length}</ImageCount>
            </ImageBadge>
          )}
        </ImageContainer>
      )}

      <ContentContainer>
        <ContentText numberOfLines={6}>{item.content || '내용이 없습니다'}</ContentText>
      </ContentContainer>

      <FooterContainer>
        <LikeContainer>
          <Ionicons name='heart-outline' size={20} color={colors.text} />
          <LikeCount>{item.likes?.length || 0}</LikeCount>
        </LikeContainer>

        <CommentContainer>
          <Ionicons name='chatbubble-outline' size={20} color={colors.text} />
          <CommentCount>{item.comments?.length || 0}</CommentCount>
        </CommentContainer>
      </FooterContainer>
    </CardContainer>
  );
}

const CardContainer = styled.TouchableOpacity`
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

const ImageContainer = styled.View`
  position: relative;
`;

const PostImage = styled.Image`
  width: ${POST_WIDTH}px;
  height: ${IMAGE_HEIGHT}px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const ImageBadge = styled.View`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm}px;
  right: ${({ theme }) => theme.spacing.sm}px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: ${({ theme }) => theme.radius.sm}px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.sm}px;
  flex-direction: row;
  align-items: center;
`;

const ImageCount = styled.Text`
  color: #fff;
  font-size: 12px;
  margin-left: 4px;
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
`;

const FooterContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.border};
`;

const LikeContainer = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const LikeCount = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  font-size: 12px;
  margin-left: 4px;
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
