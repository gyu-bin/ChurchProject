import { CampusWithAll, DepartmentWithAll } from '@/app/constants/CampusDivisions';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import styled from 'styled-components/native';
import CardPost from './CardPost';
import useGetDepartmentPost, { DepartmentPost } from './useGetDepartmentPost';

interface DepartmentFeedProps {
  selectedCampus?: CampusWithAll;
  selectedDivision?: DepartmentWithAll;
}

export default function DepartmentPostList({
  selectedCampus = 'ALL',
  selectedDivision = 'ALL',
}: DepartmentFeedProps) {
  const { colors } = useDesign();
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
        <FooterContainer>
          <FooterText>모든 게시물을 불러왔습니다.</FooterText>
        </FooterContainer>
      );
    }

    if (loading) {
      return (
        <FooterContainer>
          <ActivityIndicator color={colors.primary} />
        </FooterContainer>
      );
    }

    return null;
  };

  return (
    <Container>
      {error && (
        <ErrorContainer>
          <ErrorText>{error}</ErrorText>
        </ErrorContainer>
      )}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderCardPost}
        contentContainerStyle={{ padding: 16 }}
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
            <EmptyContainer>
              <Ionicons name='document-outline' size={48} color={colors.subtext} />
              <EmptyTitle>게시물이 없습니다.</EmptyTitle>
              <EmptyDescription>
                선택한 캠퍼스와 부서에 게시물이 없거나{'\n'}새로운 게시물을 작성해보세요.
              </EmptyDescription>
            </EmptyContainer>
          ) : null
        }
      />
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const ErrorContainer = styled.View`
  background-color: #fee2e2;
  padding: ${({ theme }) => theme.spacing.md}px;
  margin: ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  border-width: 1px;
  border-color: #fecaca;
`;

const ErrorText = styled.Text`
  color: #dc2626;
  text-align: center;
`;

const FooterContainer = styled.View`
  padding: ${({ theme }) => theme.spacing.lg}px;
  align-items: center;
`;

const FooterText = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
`;

const EmptyContainer = styled.View`
  padding: ${({ theme }) => theme.spacing.xl}px;
  align-items: center;
`;

const EmptyTitle = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  margin-top: ${({ theme }) => theme.spacing.md}px;
  font-size: 16px;
`;

const EmptyDescription = styled.Text`
  color: ${({ theme }) => theme.colors.subtext};
  font-size: 14px;
  text-align: center;
`;
