import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// QueryClient 인스턴스 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 기본 staleTime: 5분 (5 * 60 * 1000ms)
      staleTime: 5 * 60 * 1000,
      // 기본 cacheTime: 10분 (10 * 60 * 1000ms)
      gcTime: 10 * 60 * 1000,
      // 윈도우 포커스 시 자동 refetch 비활성화
      refetchOnWindowFocus: false,
      // 네트워크 재연결 시 자동 refetch 비활성화
      refetchOnReconnect: false,
      // 에러 발생 시 자동 retry 비활성화
      retry: false,
      // 백그라운드에서 refetch 비활성화
      refetchOnMount: false,
    },
    mutations: {
      // mutation 에러 시 retry 비활성화
      retry: false,
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Native에서는 DevTools를 사용하지 않음 */}
    </QueryClientProvider>
  );
};

export { queryClient };
