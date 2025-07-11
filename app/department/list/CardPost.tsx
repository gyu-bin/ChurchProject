import { CAMPUS_ENUM, DEPARTMENT_ENUM } from '@/app/constants/CampusDivisions';
import { formatFirebaseTimestamp } from '@/app/utils/formatFirebaseTimestamp';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Dimensions, Image, Text, View } from 'react-native';
import styled from 'styled-components/native';
import { DepartmentPost } from './useGetDepartmentPost';

const { width: screenWidth } = Dimensions.get('window');
const POST_WIDTH = screenWidth - 32;
const IMAGE_HEIGHT = POST_WIDTH * 1.2;

export default function CardPost({ item }: { item: DepartmentPost }) {
  const { colors, spacing, radius } = useDesign();
  const hasImages = item.imageUrls && item.imageUrls.length > 0;
  const hasMultipleImages = hasImages && item.imageUrls.length > 1;

  const handlePress = () => {
    router.push(`/department/detail/${item.id}`);
  };

  return (
    <CardContainer onPress={handlePress} activeOpacity={0.8}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.sm,
          }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
            {item.author.name.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
            {item.author.name}
          </Text>
          <Text style={{ color: colors.subtext, fontSize: 12 }}>
            {CAMPUS_ENUM[item.campus]} • {DEPARTMENT_ENUM[item.division]}
          </Text>
        </View>
        <Text style={{ color: colors.subtext, fontSize: 12 }}>
          {formatFirebaseTimestamp(item.createdAt)}
        </Text>
      </View>

      {/* Image Section */}
      {hasImages && (
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: item.imageUrls[0] }}
            style={{
              width: POST_WIDTH,
              height: IMAGE_HEIGHT,
              backgroundColor: colors.background,
            }}
            resizeMode='cover'
          />

          {/* Multiple images badge */}
          {hasMultipleImages && (
            <View
              style={{
                position: 'absolute',
                top: spacing.sm,
                right: spacing.sm,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderRadius: radius.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
              <Ionicons name='images' size={16} color='#fff' />
              <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4 }}>
                {item.imageUrls.length}
              </Text>
            </View>
          )}
        </View>
      )}

      <View
        style={{
          width: POST_WIDTH,
          justifyContent: 'center',
          padding: spacing.lg,
        }}>
        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            fontWeight: '500',
          }}
          numberOfLines={6}>
          {item.content || '내용이 없습니다'}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons name='heart-outline' size={20} color={colors.text} />
          <Text style={{ color: colors.subtext, fontSize: 12, marginLeft: 4 }}>
            {item.likes?.length || 0}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name='chatbubble-outline' size={20} color={colors.text} />
          <Text style={{ color: colors.subtext, fontSize: 12, marginLeft: 4 }}>
            {item.comments?.length || 0}
          </Text>
        </View>
      </View>
    </CardContainer>
  );
}

// 스타일드 컴포넌트 왜 안되지...
const CardContainer = styled.TouchableOpacity`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  elevation: 3;
  overflow: hidden;
`;
