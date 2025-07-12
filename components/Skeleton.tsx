import { useDesign } from '@/context/DesignSystem';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, Dimensions } from 'react-native';
interface SkeletonBoxProps {
  width?: number;
  height?: number;
  borderRadius?: number;
}

export default function SkeletonBox({
  width = Dimensions.get('window').width - 40, // default 값은 화면 너비
  height = 16,
  borderRadius = 8,
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const { colors } = useDesign();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop(); // cleanup
  }, []);

  const animatedStyle: Animated.WithAnimatedObject<ViewStyle> = {
    width,
    height,
    borderRadius,
    opacity,
    backgroundColor: colors.surface,
    marginBottom: 8,
  };

  return <Animated.View style={animatedStyle} />;
}
