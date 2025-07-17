import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import weekday from 'dayjs/plugin/weekday';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import AnimatedDotsCarousel from 'react-native-animated-dots-carousel';
import Carousel from 'react-native-reanimated-carousel';

dayjs.extend(weekday);
dayjs.extend(localizedFormat);
dayjs.locale('ko');

export default function EventBannerCarousel({ events = [], goToEvent, theme }: any) {
  const frame = useWindowDimensions();
  // const SCREEN_WIDTH = frame.width;
  const windowWidth = Dimensions.get('window').width;
  const SCREEN_WIDTH = frame.width > 0 ? frame.width : windowWidth > 0 ? windowWidth : 390;
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<any>(null);

  if (SCREEN_WIDTH === 0) {
    return null; // 화면 크기 잡힐 때까지 렌더링 안함
  }

  const formattedDateTime = (startDate: any, startTime: string, location: string) => {
    const date = dayjs(startDate?.toDate ? startDate.toDate() : startDate);
    if (!date.isValid()) return '';

    const month = date.month() + 1;
    const day = date.date();
    const dayOfWeek = date.format('dd'); // 월, 화, 수...

    return `${month}월 ${day}일(${dayOfWeek}) ${startTime}, ${location}`;
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => goToEvent(item.id)}
      style={{ width: SCREEN_WIDTH }}>
      {item.bannerImage ? (
        <View
          style={{
            backgroundColor: '#CCB08A',
            borderRadius: 16,
            paddingVertical: 24,
            paddingHorizontal: 20,
            alignItems: 'center',
            width: SCREEN_WIDTH * 0.93,
            height: 400,
          }}>
          {/* 배너 이미지 */}
          <Image
            source={{ uri: item.bannerImage }}
            style={{
              marginTop: 30,
              width: SCREEN_WIDTH * 0.7,
              height: 250,
              borderRadius: 8,
              marginBottom: 16,
              overflow: 'hidden',
              aspectRatio: 4 / 3,
            }}
            contentFit='contain'
            cachePolicy='disk'
          />

          {/* 제목 */}
          <Text
            style={{
              fontSize: 30,
              fontWeight: 'bold',
              color: '#fff',
              textAlign: 'center',
              marginBottom: 6,
            }}>
            {item.title}
          </Text>

          {/* 날짜 + 시간 + 장소 */}
          <Text
            style={{
              fontSize: 20,
              color: '#f0f0f0',
              textAlign: 'center',
            }}>
            {formattedDateTime(item.startDate, item.startTime, item.location)}
          </Text>
        </View>
      ) : (
        <View
          style={{
            width: SCREEN_WIDTH,
            backgroundColor: theme.colors.card,
            padding: 24,
            justifyContent: 'center',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderColor: theme.colors.border,
          }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: theme.colors.text,
              marginBottom: 10,
            }}>
            {item.title}
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: theme.colors.text,
              marginBottom: 10,
            }}>
            {item.content}
          </Text>
          <View
            style={{
              alignSelf: 'center',
              backgroundColor: theme.colors.primary,
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 7,
            }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>자세히 보기</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View>
      {/* 상단 페이지 인디케이터 */}
      {events.length > 1 && (
        <View
          style={{
            position: 'absolute',
            top: 15,
            right: 15,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
            zIndex: 999,
          }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
            {currentIndex + 1} / {events.length}
          </Text>
        </View>
      )}

      {/* Carousel */}
      <Carousel
        ref={carouselRef}
        loop
        enabled={false} // 🛑 스와이프 막기
        width={SCREEN_WIDTH}
        height={400}
        data={events}
        autoPlay={false}
        scrollAnimationDuration={1200} // ✅ 느린 전환
        onSnapToItem={(index) => setCurrentIndex(index)}
        renderItem={renderItem}
      />

      {/* 좌우 버튼 */}
      {events.length > 1 && (
        <>
          <TouchableOpacity
            onPress={() => carouselRef.current?.prev()}
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              transform: [{ translateY: -20 }],
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: 30,
              padding: 10,
              zIndex: 999,
            }}>
            <Ionicons name='chevron-back' size={16} color='#fff' />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => carouselRef.current?.next()}
            style={{
              position: 'absolute',
              top: '50%',
              right: 0,
              transform: [{ translateY: -20 }],
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: 30,
              padding: 10,
              zIndex: 999,
            }}>
            <Ionicons name='chevron-forward' size={16} color='#fff' />
          </TouchableOpacity>
        </>
      )}

      {/* 도트 페이지 인디케이터 */}
      {events.length > 1 && (
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <AnimatedDotsCarousel
            length={events.length}
            currentIndex={currentIndex}
            maxIndicators={5}
            interpolateOpacityAndColor
            activeIndicatorConfig={{
              color: theme.colors.primary,
              margin: 3,
              opacity: 1,
              size: 10,
            }}
            inactiveIndicatorConfig={{
              color: theme.colors.border,
              margin: 3,
              opacity: 0.5,
              size: 8,
            }}
            decreasingDots={[
              {
                quantity: 1, // ✅ 추가
                config: {
                  size: 8,
                  opacity: 0.7,
                  color: theme.colors.border,
                  margin: 3,
                },
              },
              {
                quantity: 1, // ✅ 추가
                config: {
                  size: 6,
                  opacity: 0.5,
                  color: theme.colors.border,
                  margin: 3,
                },
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}
