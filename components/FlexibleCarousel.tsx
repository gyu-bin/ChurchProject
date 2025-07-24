import React, { useRef, useEffect } from 'react';
import { View, FlatList, useWindowDimensions } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
interface FlexibleCarouselProps {
  data: any[];
  renderItem: (item: any) => React.ReactNode;
}

const MULTIPLIER = 1000;

const FlexibleCarousel: React.FC<FlexibleCarouselProps> = ({ data, renderItem }) => {
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();

  // 💡 동적 계산
  const ITEM_WIDTH = frame.width * 0.7;
  const ITEM_MARGIN_RIGHT = frame.width * 0.1;
  const NEXT_VISIBLE = frame.width * 0.25;
  const SNAP_INTERVAL = ITEM_WIDTH + ITEM_MARGIN_RIGHT;

  const flatListRef = useRef<FlatList>(null);
  const infiniteData = Array.from(
    { length: data.length * MULTIPLIER },
    (_, i) => data[i % data.length]
  );
  const initialIndex = Math.floor(infiniteData.length / 2);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    }, 0);
  }, [initialIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offsetX / SNAP_INTERVAL);

    if (currentIndex <= data.length || currentIndex >= infiniteData.length - data.length) {
      // ✅ 루프 보정 시 애니메이션 적용
      flatListRef.current?.scrollToIndex({ index: initialIndex, animated: true });
    }
  };

  return (
    <FlatList
      ref={flatListRef}
      data={infiniteData}
      horizontal
      showsHorizontalScrollIndicator={false}
      pagingEnabled={false}
      snapToInterval={SNAP_INTERVAL}
      snapToAlignment='start'
      decelerationRate={0.95}
      bounces={true}
      contentContainerStyle={{
        paddingRight: NEXT_VISIBLE,
      }}
      initialScrollIndex={initialIndex}
      getItemLayout={(_, index) => ({
        length: SNAP_INTERVAL,
        offset: SNAP_INTERVAL * index,
        index,
      })}
      keyExtractor={(_, index) => index.toString()}
      onMomentumScrollEnd={handleScroll}
      renderItem={({ item }) => (
        <View style={{ width: frame.width, marginRight: ITEM_MARGIN_RIGHT }}>
          {renderItem(item)}
        </View>
      )}
    />
  );
};

export default FlexibleCarousel;
