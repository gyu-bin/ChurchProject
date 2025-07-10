import React from 'react';
import { FlatList, FlatListProps } from 'react-native';

interface OptimizedFlatListProps<ItemT> extends FlatListProps<ItemT> {}

function OptimizedFlatList<ItemT>(props: OptimizedFlatListProps<ItemT>) {
  return (
    <FlatList
      {...props}
      removeClippedSubviews={true}
      initialNumToRender={10}
      windowSize={5}
    />
  );
}

export default OptimizedFlatList; 