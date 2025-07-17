import { useDesign } from '@/context/DesignSystem';
import React, { useEffect, useRef } from 'react';
import { Animated, useWindowDimensions, ViewStyle } from 'react-native';
interface SkeletonBoxProps {
  width?: number;
  height?: number;
  borderRadius?: number;
}

export default function SkeletonBox({
  width,
  height = 16,
  borderRadius = 8,
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const { colors } = useDesign();
  const frame = useWindowDimensions();
  const computedWidth = width ?? frame.width - 40;

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
    width: computedWidth,
    height,
    borderRadius,
    opacity,
    backgroundColor: colors.surface,
    marginBottom: 8,
  };

  return <Animated.View style={animatedStyle} />;
}
