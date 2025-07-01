/*
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, ImageBackground, Text, TouchableOpacity, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import weekday from 'dayjs/plugin/weekday';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import {font} from "@/context/DesignSystem";
import { Image } from 'expo-image';
const SCREEN_WIDTH = Dimensions.get('window').width;

dayjs.extend(weekday);
dayjs.extend(localizedFormat);
dayjs.locale('ko');

export default function EventBannerCarousel({ events = [], goToEvent, theme }: any) {
  const flatListRef = useRef<FlatList>(null);
  const [data, setData] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(1); // dummy 앞뒤

  useEffect(() => {
    if (!events || events.length === 0) return;

    if (events.length === 1) {
      setData(events);
      setCurrentIndex(0);
    } else {
      const extended = [
        { ...events[events.length - 1], id: 'dummy-left' },
        ...events,
        { ...events[0], id: 'dummy-right' },
      ];
      setData(extended);
      setCurrentIndex(1);

      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 1, animated: false });
      }, 10);
    }
  }, [events]);

  const scrollToIndex = (index: number, animated = true) => {
    if (index < 0 || index >= data.length) return;
    flatListRef.current?.scrollToIndex({ index, animated });
    setCurrentIndex(index);
  };

  const handleScrollEnd = (e: any) => {
    const contentOffset = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / SCREEN_WIDTH);

    if (index === 0) {
      scrollToIndex(data.length - 2, false); // 오른쪽 끝에서 첫 아이템
    } else if (index === data.length - 1) {
      scrollToIndex(1, false); // 왼쪽 끝에서 첫 아이템
    } else {
      setCurrentIndex(index);
    }
  };

  const formattedDateTime = (
      startDate: any, // Timestamp 또는 string
      startTime: string,
      location: string
  ) => {
    const date = dayjs(startDate?.toDate ? startDate.toDate() : startDate);
    if (!date.isValid()) return ''; // 혹시라도 아직 값이 안 들어온 경우

    const month = date.month() + 1;
    const day = date.date();
    const dayOfWeek = date.format('dd'); // 월, 화, 수...

    return `${month}월 ${day}일(${dayOfWeek}) ${startTime}, ${location}`;
  };

  const renderItem = ({ item }: any) => (
      <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => goToEvent(item.id)}
          style={{ width: SCREEN_WIDTH }}
      >
        {item.bannerImage ? (
            <View
                style={{
                  backgroundColor: '#CCB08A',
                  borderRadius: 16,
                  paddingVertical: 24,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  width: SCREEN_WIDTH * 0.93,
                  height: 400
                }}
            >
              {/!* 배너 이미지 *!/}
              <Image
                  source={{ uri: item.bannerImage }}
                  style={{
                    marginTop: 20,
                    width: SCREEN_WIDTH * 0.5,
                    height: 250,
                    borderRadius: 8,
                    marginBottom: 16,
                    overflow: 'hidden',
                  }}
                  contentFit="cover"
                  cachePolicy="disk"
              />

              {/!* 제목 *!/}
              <Text
                  style={{
                    fontSize: 30,
                    fontWeight: 'bold',
                    color: '#fff',
                    textAlign: 'center',
                    marginBottom: 6,
                  }}
              >
                {item.title}
              </Text>

              {/!* 날짜 + 시간 + 장소 *!/}
              <Text
                  style={{
                    fontSize: 20,
                    color: '#f0f0f0',
                    textAlign: 'center',
                  }}
              >
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
                }}
            >
              <Text
                  style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: theme.colors.text,
                    marginBottom: 10,
                  }}
              >
                {item.title}
              </Text>
              <Text
                  style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: theme.colors.text,
                    marginBottom: 10,
                  }}
              >
               {item.content}
              </Text>
              <View
                  style={{
                    alignSelf: 'center',
                    backgroundColor: theme.colors.primary,
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                  }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>
                  자세히 보기
                </Text>
              </View>
            </View>
        )}
      </TouchableOpacity>
  );

  const realLength = events.length;
  const visibleIndex = realLength === 1 ? 1 : Math.min(Math.max(currentIndex, 1), realLength);

  return (
    <View>
      <View style={{ position: 'relative' }}>

        {realLength > 1 && (
            <View
                style={{
                  position: 'absolute',
                  top: 15,
                  right: 10,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  zIndex: 999,
                }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                {visibleIndex} / {realLength}
              </Text>
            </View>
        )}

        <FlatList
          ref={flatListRef}
          data={data}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={SCREEN_WIDTH}
          decelerationRate="fast"
          keyExtractor={(item, index) => item.id ?? `event-${index}`}
          onMomentumScrollEnd={handleScrollEnd}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index
          })}
          initialScrollIndex={events.length === 1 ? 0 : 1}
          renderItem={renderItem}
        />


  {events.length > 1 && (
        <TouchableOpacity
          onPress={() => {
          const nextIndex = currentIndex - 1;
          if (nextIndex >= 0) {
          scrollToIndex(nextIndex);
      }
      }}
        style={{
          position: 'absolute',
          top: '45%',
          left: 8,
          backgroundColor: 'rgba(0,0,0,0.4)',
          padding: 6,
          borderRadius: 20,
          zIndex: 10
        }}>
          <Ionicons name="chevron-back" size={16} color="#fff" />
        </TouchableOpacity>
)}
  {events.length > 1 && (
        <TouchableOpacity
         onPress={() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex < data.length) {
        scrollToIndex(nextIndex);
      }
    }}
        style={{
          position: 'absolute',
          top: '45%',
          right: 8,
          backgroundColor: 'rgba(0,0,0,0.4)',
          padding: 6,
          borderRadius: 20,
          zIndex: 10
        }}>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </View>

      {events.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
          {events.map((_:any, i:any) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginHorizontal: 4,
                backgroundColor: (i === currentIndex - 1)
                  ? theme.colors.primary
                  : theme.colors.border
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
*/
