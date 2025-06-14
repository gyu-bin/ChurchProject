import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, ImageBackground, Text, TouchableOpacity, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

  const renderItem = ({ item }: any) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => goToEvent(item.id)} style={{ width: SCREEN_WIDTH }}>
      <ImageBackground
        source={{ uri: item.bannerImage }}
        style={{ width: SCREEN_WIDTH, height: 300, justifyContent: 'flex-end' }}
      >
        <View style={{ backgroundColor: 'rgba(0,0,0,0.32)', padding: 10 }}>
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: 'bold', marginBottom: 6 }}>{item.title}</Text>
          {/* <Text style={{ color: '#fff', fontSize: 15, marginBottom: 10 }}>{item.content}</Text> */}
          {/* <View style={{ alignSelf: 'flex-start', backgroundColor: theme.colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>자세히 보기</Text>
          </View> */}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  if (!events || events.length === 0) return null;

  return (
    <View>
      <View style={{ position: 'relative' }}>
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

      {/* 🔘 인디케이터 (실제 데이터 기준) */}
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