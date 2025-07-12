import SkeletonBox from '@/components/Skeleton';
import { DepartmentPost } from '@components/department/main/list/useGetDepartmentPost';
import React, { useState } from 'react';
import { Dimensions } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import styled from 'styled-components/native';

const { width: screenWidth } = Dimensions.get('window');

export default function PostCarousel({ post }: { post: DepartmentPost }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>({});

  const handleImageLoad = (uri: string) => {
    setImageLoading((prev) => ({ ...prev, [uri]: false }));
  };

  const handleImageLoadStart = (uri: string) => {
    setImageLoading((prev) => ({ ...prev, [uri]: true }));
  };

  const renderImage = ({ item }: { item: string }) => (
    <ImageContainer>
      {imageLoading[item] && <SkeletonBox height={screenWidth * 1.2} width={screenWidth} />}
      <PostImage
        source={{ uri: item }}
        resizeMode='cover'
        onLoadStart={() => handleImageLoadStart(item)}
        onLoad={() => handleImageLoad(item)}
      />
    </ImageContainer>
  );

  return (
    post.imageUrls &&
    post.imageUrls.length > 0 && (
      <ImageContainer>
        <Carousel
          data={post.imageUrls}
          renderItem={renderImage}
          width={screenWidth}
          height={screenWidth * 1.2}
          loop={false}
          onSnapToItem={(index) => setCurrentIndex(index)}
        />
        {post.imageUrls.length > 1 && (
          <ImageIndicator>
            <ImageIndicatorText>
              {currentIndex + 1} / {post.imageUrls.length}
            </ImageIndicatorText>
          </ImageIndicator>
        )}
      </ImageContainer>
    )
  );
}

const ImageContainer = styled.View`
  position: relative;
`;

const ImageIndicator = styled.View`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md}px;
  right: ${({ theme }) => theme.spacing.md}px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: ${({ theme }) => theme.radius.sm}px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.sm}px;
  z-index: 2;
`;

const ImageIndicatorText = styled.Text`
  color: #fff;
  font-size: 12px;
`;

const PostImage = styled.Image`
  width: ${screenWidth}px;
  height: ${screenWidth * 1.2}px;
  background-color: ${({ theme }) => theme.colors.background};
`;
