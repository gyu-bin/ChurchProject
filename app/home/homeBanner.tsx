import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, ImageBackground, Text, TouchableOpacity, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function EventBannerCarousel({ events = [], goToEvent, theme }: any) {
  const flatListRef = useRef<FlatList>(null);
  const [data, setData] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(1); // dummy 앞뒤

  // exampleEventData.ts
  const eventBannerSample = [
    {
      id: 'summer-retreat-2025',
      title: '2025 여름 수련회 신청 오픈!',
      bannerImage: 'https://i.pinimg.com/736x/19/09/c8/1909c81247d7deb3c9b398d4c2c02f32.jpg',
      startDate: { seconds: 1751846400 }, // 2025-07-07
      endDate: { seconds: 1752364800 },   // 2025-07-12
      content: '올여름 수련회에 함께하세요! 찬양과 말씀, 교제와 회복의 시간이 기다리고 있습니다. 지금 신청하고 하나님의 은혜를 경험해보세요.',
    },
    {
      id: 'new-family-class',
      title: '앱 출시가 다가오고 있습니다.',
      bannerImage: 'https://i.pinimg.com/736x/9d/cb/65/9dcb6537520307c24d1cd945c30fbf5f.jpg',
      startDate: { seconds: 1750128000 }, // 2025-06-17
      endDate: { seconds: 1750732800 },   // 2025-06-24
      content: '출시날까지 모두 화이팅입니다. 잘되면 좋은것 아니겠습니다. 하하',
    },
    {
      id: 'bible-reading-challenge',
      title: '성경읽기',
      bannerImage: 'https://i.pinimg.com/736x/7a/5e/e2/7a5ee2a0ad179a65368b1f1a0d63a8c2.jpg',
      startDate: { seconds: 1750032000 }, // 2025-06-16
      endDate: { seconds: 1752624000 },   // 2025-07-16
      content: '성경을 읽는것은 나의 삶에 중요한 일입니다. 모두 함께 읽도록 하죠',
    },
    {
      id: 'church-running-campain',
      title: '시광마라톤대회',
      bannerImage: '',
      startDate: { seconds: 1750032000 }, // 2025-06-16
      endDate: { seconds: 1752624000 },   // 2025-07-16
      content: '인간은 달리기위해 태어났죠. 열심히 달려봅시다 모두',
    }
  ];

  /*useEffect(() => {
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
  }, [events]);*/

  //샘플코드
  useEffect(() => {
    if (eventBannerSample.length === 1) {
      setData(eventBannerSample);
      setCurrentIndex(0);
    } else {
      const extended = [
        { ...eventBannerSample[eventBannerSample.length - 1], id: 'dummy-left' },
        ...eventBannerSample,
        { ...eventBannerSample[0], id: 'dummy-right' },
      ];
      setData(extended);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 1, animated: false });
      }, 10);
    }
  }, []);

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
      <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => goToEvent(item.id)}
          style={{ width: SCREEN_WIDTH }}
      >
        {item.bannerImage ? (
            <ImageBackground
                source={{ uri: item.bannerImage }}
                style={{
                  width: SCREEN_WIDTH,
                  height: 300,
                  justifyContent: 'flex-end',
                  overflow: 'hidden',
                }}
                resizeMode="cover"
            >
              <View style={{ backgroundColor: 'rgba(0,0,0,0.32)', padding: 10 }}>
                <Text style={{ color: '#fff', fontSize: 30, fontWeight: 'bold', marginBottom: 6 }}>
                  {item.title}
                </Text>
                <View
                    style={{
                      alignSelf: 'flex-start',
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
            </ImageBackground>
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
      {/* 🔘 인디케이터 (샘플 데이터 기준) */}
      {eventBannerSample.length > 1 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
            {eventBannerSample.map((_, i) => (
                <View
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      marginHorizontal: 4,
                      backgroundColor: i === currentIndex - 1
                          ? theme.colors.primary
                          : theme.colors.border,
                    }}
                />
            ))}
          </View>
      )}
      {/*{events.length > 1 && (
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
      )}*/}
    </View>
  );
}
