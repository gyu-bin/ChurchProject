import React, { useRef, useEffect } from 'react';
import { View, FlatList, Dimensions } from 'react-native';

interface FlexibleCarouselProps {
    data: any[];
    renderItem: (item: any) => React.ReactNode;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = SCREEN_WIDTH * 0.7;               // 80%
const ITEM_MARGIN_RIGHT = SCREEN_WIDTH * 0.05;       // 5%
const NEXT_VISIBLE = SCREEN_WIDTH * 0.15;            // 오른쪽 15% 보이게
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_MARGIN_RIGHT;
const MULTIPLIER = 1000;

const FlexibleCarousel: React.FC<FlexibleCarouselProps> = ({ data, renderItem }) => {
    const flatListRef = useRef<FlatList>(null);
    const infiniteData = Array.from({ length: data.length * MULTIPLIER }, (_, i) => data[i % data.length]);
    const initialIndex = Math.floor(infiniteData.length / 2);

    useEffect(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
        }, 0);
    }, []);

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const currentIndex = Math.round(offsetX / SNAP_INTERVAL);

        if (currentIndex <= data.length || currentIndex >= infiniteData.length - data.length) {
            flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
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
            snapToAlignment="start"
            decelerationRate="fast"
            bounces={false}
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
                <View style={{ width: ITEM_WIDTH, marginRight: ITEM_MARGIN_RIGHT }}>
                    {renderItem(item)}
                </View>
            )}
        />
    );
};

export default FlexibleCarousel;
