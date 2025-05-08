// components/Skeleton.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function SkeletonBox({ height = 20, width = '100%', radius = 6 }) {
    // @ts-ignore
    return <View style={[styles.skeleton, { height, width, borderRadius: radius }]} />;
}

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#e5e7eb',
        marginBottom: 10,
        opacity: 0.7,
    },
});
