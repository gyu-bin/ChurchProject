import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Image,
  StyleSheet,
  InteractionManager,
} from 'react-native';
import { performanceTest } from '@/utils/performanceTest';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TestResult = {
  name: string;
  duration: number;
  status: '✅ 좋음' | '⚠️ 보통' | '❌ 나쁨';
};

const PerformanceTestScreen = () => {
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [showFlatList, setShowFlatList] = useState(false);
  const [showImageTest, setShowImageTest] = useState(false);
  const insets = useSafeAreaInsets();

  const evaluatePerformance = (duration: number): TestResult['status'] => {
    if (duration < 50) return '✅ 좋음';
    if (duration < 300) return '⚠️ 보통';
    return '❌ 나쁨';
  };

  const recordResult = (name: string, duration: number) => {
    const status = evaluatePerformance(duration);
    setResults((prev) => [...prev, { name, duration, status }]);
  };

  const measureWithInteraction = (name: string, callback: () => void) => {
    performanceTest.startTest(name);
    callback();
    InteractionManager.runAfterInteractions(() => {
      const { duration } = performanceTest.endTest(name);
      recordResult(name, duration);
    });
  };

  const testRenderPerformance = () => {
    measureWithInteraction('렌더링 성능', () => {
      Array.from({ length: 1000 }).map((_, idx) => <Text key={idx}>{`Item ${idx}`}</Text>);
    });
  };

  const testFlatListPerformance = () => {
    setShowFlatList(true);
    setTimeout(() => {
      measureWithInteraction('FlatList', () => {
        setShowFlatList(false);
      });
    }, 500);
  };

  const testApiCallPerformance = async () => {
    setLoading(true);
    performanceTest.startTest('API_Call');
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts');
      const data = await response.json();
      const { duration } = performanceTest.endTest('API_Call');
      setApiResult(`Fetched ${data.length} items`);
      recordResult('API 호출 속도', duration);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const testImageRendering = () => {
    setShowImageTest(true);
    setTimeout(() => {
      measureWithInteraction('대용량 이미지 렌더링', () => {
        setShowImageTest(false);
      });
    }, 2000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>🚀 성능 테스트 페이지</Text>

      {[
        { title: '렌더링 성능 테스트', color: '#4CAF50', action: testRenderPerformance },
        { title: 'FlatList 스크롤 테스트', color: '#2196F3', action: testFlatListPerformance },
        { title: 'API 호출 속도 테스트', color: '#FF9800', action: testApiCallPerformance },
        { title: '대용량 이미지 렌더링', color: '#3F51B5', action: testImageRendering },
      ].map((btn, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={btn.action}
          style={[styles.button, { backgroundColor: btn.color }]}>
          <Text style={styles.buttonText}>{btn.title}</Text>
        </TouchableOpacity>
      ))}

      {loading && <ActivityIndicator size='large' color='#000' style={{ marginTop: 20 }} />}
      {apiResult && <Text style={styles.apiResult}>{apiResult}</Text>}

      {results.length > 0 && (
        <ScrollView style={{ marginTop: 20 }}>
          <Text style={styles.resultTitle}>📊 테스트 결과</Text>
          {results.map((res, idx) => (
            <View
              key={idx}
              style={[
                styles.resultCard,
                {
                  borderLeftColor:
                    res.status === '✅ 좋음'
                      ? '#4CAF50'
                      : res.status === '⚠️ 보통'
                        ? '#FFC107'
                        : '#F44336',
                },
              ]}>
              <Text style={styles.resultName}>{res.name}</Text>
              <Text style={styles.resultDetail}>⏱ Duration: {res.duration.toFixed(1)} ms</Text>
              <Text style={styles.resultStatus}>{res.status}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {showFlatList && (
        <FlatList
          data={Array.from({ length: 1000 }).map((_, idx) => ({
            key: `${idx}`,
            label: `Item ${idx}`,
          }))}
          renderItem={({ item }) => <Text>{item.label}</Text>}
          keyExtractor={(item) => item.key}
          initialNumToRender={20}
          windowSize={10}
          maxToRenderPerBatch={20}
          removeClippedSubviews={true}
          style={{ marginTop: 20, height: 300 }}
        />
      )}

      {showImageTest && (
        <ScrollView style={{ marginTop: 20 }}>
          {Array.from({ length: 50 }).map((_, idx) => (
            <Image
              key={idx}
              source={{ uri: `https://picsum.photos/800/600?random=${idx}` }}
              style={{ width: '100%', height: 200, marginBottom: 8 }}
              resizeMode='cover'
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  button: { padding: 16, borderRadius: 8, marginBottom: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  apiResult: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  resultTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  resultCard: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  resultName: { fontSize: 16, fontWeight: '500' },
  resultDetail: { fontSize: 14 },
  resultStatus: { fontSize: 14 },
});

export default PerformanceTestScreen;
