import SkeletonBox from '@/components/Skeleton';
import { DepartmentPost } from '@components/department/main/list/useGetDepartmentPost';
import React, { useState } from 'react';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import Carousel from 'react-native-reanimated-carousel';
import { View, Text, Image } from 'react-native';

export default function PostCarousel({ post }: { post: DepartmentPost }) {
  const frame = useSafeAreaFrame();
  const screenWidth = frame.width;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>({});

  const handleImageLoad = (uri: string) => {
    setImageLoading((prev) => ({ ...prev, [uri]: false }));
  };

  const handleImageLoadStart = (uri: string) => {
    setImageLoading((prev) => ({ ...prev, [uri]: true }));
  };

  const renderImage = ({ item }: { item: string }) => (
    <View style={{ position: 'relative' }}>
      {imageLoading[item] && <SkeletonBox height={screenWidth * 1.2} width={screenWidth} />}
      <Image
        source={{ uri: item }}
        resizeMode='cover'
        onLoadStart={() => handleImageLoadStart(item)}
        onLoad={() => handleImageLoad(item)}
        style={{
          width: screenWidth,
          height: screenWidth * 1.2,
          backgroundColor: '#f2f2f2', // 기존 theme.colors.background 대신
        }}
      />
    </View>
  );

  return (
    post.imageUrls &&
    post.imageUrls.length > 0 && (
      <View style={{ position: 'relative' }}>
        <Carousel
          data={post.imageUrls}
          renderItem={renderImage}
          width={screenWidth}
          height={screenWidth * 1.2}
          loop={false}
          onSnapToItem={(index) => setCurrentIndex(index)}
        />
        {post.imageUrls.length > 1 && (
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 4,
              zIndex: 2,
            }}>
            <Text style={{ color: '#fff', fontSize: 12 }}>
              {currentIndex + 1} / {post.imageUrls.length}
            </Text>
          </View>
        )}
      </View>
    )
  );
}
