import { Animated } from 'react-native';
import styled from 'styled-components/native';

const pulseAnim = new Animated.Value(0.3);

Animated.loop(
  Animated.sequence([
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }),
    Animated.timing(pulseAnim, {
      toValue: 0.3,
      duration: 1000,
      useNativeDriver: true,
    }),
  ])
).start();

export default function SkeletonView() {
  return <SkeletonViewContainer style={{ opacity: pulseAnim }} />;
}

const SkeletonViewContainer = styled(Animated.View)`
  background-color: ${({ theme }) => theme.colors.background};
`;
