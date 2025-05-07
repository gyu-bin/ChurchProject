import React, { ReactNode } from 'react';
import { ScrollView, RefreshControl, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface PageWrapperProps {
    children: ReactNode;
    onRefresh?: () => void;
    refreshing?: boolean;
    onEndReached?: () => void;
    isEndReachedEnabled?: boolean; // 기본값: true
}

export default function PageWrapper({
                                        children,
                                        onRefresh,
                                        refreshing = false,
                                        onEndReached,
                                        isEndReachedEnabled = true,
                                    }: PageWrapperProps) {
    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 30;

        const isBottomReached =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

        if (isBottomReached && onEndReached && isEndReachedEnabled) {
            onEndReached();
        }
    };

    return (
        <ScrollView
            contentContainerStyle={{ padding: 20 }}
            style={{ flex: 1, backgroundColor: '#f9fafb' }}
            refreshControl={
                onRefresh ? (
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                ) : undefined
            }
            onScroll={onEndReached ? handleScroll : undefined}
            scrollEventThrottle={100}
        >
            {children}
        </ScrollView>
    );
}
