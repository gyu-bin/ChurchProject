import { CampusWithAll, DepartmentWithAll } from '@/app/constants/CampusDivisions';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import useGetDepartmentPost, { DepartmentPost } from './useGetDepartmentPost';
import CardPost from './CardPost';

interface DepartmentFeedProps {
  selectedCampus?: CampusWithAll;
  selectedDivision?: DepartmentWithAll;
}

export default function DepartmentPostList({
  selectedCampus = 'ALL',
  selectedDivision = 'ALL',
}: DepartmentFeedProps) {
  const { colors, spacing, radius } = useDesign();
  const { posts, loading, error, hasMore, loadMore, refresh } = useGetDepartmentPost({
    selectedCampus,
    selectedDivision,
    limitCount: 10,
    enableRealtime: true,
  });

  const renderCardPost = ({ item }: { item: DepartmentPost }) => <CardPost item={item} />;

  const renderFooter = () => {
    if (!hasMore) {
      return (
        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: colors.subtext }}>모든 게시물을 불러왔습니다.</Text>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {error && (
        <View
          style={{
            backgroundColor: '#fee2e2',
            padding: spacing.md,
            margin: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: '#fecaca',
          }}>
          <Text style={{ color: '#dc2626', textAlign: 'center' }}>{error}</Text>
        </View>
      )}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderCardPost}
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={loading && posts.length === 0}
            onRefresh={refresh}
            colors={[colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Ionicons name='document-outline' size={48} color={colors.subtext} />
              <Text
                style={{
                  color: colors.subtext,
                  marginTop: spacing.md,
                  fontSize: 16,
                }}>
                게시물이 없습니다.
              </Text>
              <Text
                style={{
                  color: colors.subtext,
                  fontSize: 14,
                  textAlign: 'center',
                }}>
                선택한 캠퍼스와 부서에 게시물이 없거나{'\n'}새로운 게시물을 작성해보세요.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
