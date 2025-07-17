import sgData from '@/assets/catechism/catechism.json';
import largerData from '@/assets/catechism/largerCatechism.json';
import shorterData from '@/assets/catechism/shorterCatechism.json';
import { useDesign } from '@/context/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

const categories = [
  { label: '대요리 문답', key: 'larger', data: largerData },
  { label: '소요리 문답', key: 'shorter', data: shorterData },
  { label: '시광교리 문답', key: 'sg', data: sgData },
];

export default function CatechismPage() {
  const pagerRef = useRef<PagerView>(null);
  const flatListRef = useRef<FlatList>(null);
  const itemHeightRef = useRef(60);

  const [selectedCategory, setSelectedCategory] = useState(categories[1]);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const { colors, font, spacing, radius } = useDesign();
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();

  //검색
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  const [fontScale, setFontScale] = useState(1); // 기본값: 1배

  useEffect(() => {
    const loadState = async () => {
      const storedCate = await AsyncStorage.getItem('last_catechism_category');
      const storedNum = await AsyncStorage.getItem(`last_seen_${storedCate || 'shorter'}`);
      const found = categories.find((c) => c.key === storedCate);
      const indexToSet = storedNum ? Math.max(parseInt(storedNum) - 1, 0) : 0;

      if (found) setSelectedCategory(found);
      setCurrentIndex(indexToSet);
      setInitialized(true);
    };

    loadState();
  }, []);

  const saveState = async (cateKey: string, index: number) => {
    await AsyncStorage.setItem('last_catechism_category', cateKey);
    await AsyncStorage.setItem(`last_seen_${cateKey}`, (index + 1).toString());
  };

  const handlePageSelected = async (e: any) => {
    const newIndex = e.nativeEvent.position;
    setCurrentIndex(newIndex);
    await saveState(selectedCategory.key, newIndex);
  };

  const handleSelect = (num: number) => {
    const index = Math.max(num - 1, 0);
    setCurrentIndex(index);
    pagerRef.current?.setPage(index);
    saveState(selectedCategory.key, index);
    setModalVisible(false);
  };

  const handleCategoryChange = async (category: typeof selectedCategory) => {
    const storedNum = await AsyncStorage.getItem(`last_seen_${category.key}`);
    const restoredIndex = storedNum ? Math.max(parseInt(storedNum) - 1, 0) : 0;

    setSelectedCategory(category);
    setCurrentIndex(restoredIndex);
    saveState(category.key, restoredIndex);

    setTimeout(() => {
      pagerRef.current?.setPage(restoredIndex);
    }, 0);

    setCategoryModal(false);
  };

  const openQuestionModal = () => {
    setModalVisible(true);

    setTimeout(() => {
      const ITEM_HEIGHT = 60;
      const screenHeight = frame.height;
      const headerHeight = insets.top + 40 + spacing.lg * 2; // 여유 padding 포함

      // 플랫폼별 가중치 적용
      const offsetMultiplier = Platform.OS === 'ios' ? 0.5 : 0.1;

      const targetOffset =
        currentIndex * ITEM_HEIGHT -
        (screenHeight - headerHeight) * offsetMultiplier +
        ITEM_HEIGHT / 2;

      flatListRef.current?.scrollToOffset({
        offset: Math.max(targetOffset, 0),
        animated: false,
      });
    }, 350); // Modal 완전히 열리고 실행
  };

  const highlightText = (text: string, keyword: string) => {
    if (!keyword) return <Text>{text}</Text>;
    const regex = new RegExp(`(${keyword})`, 'gi');
    const parts = text.split(regex);

    return (
      <Text>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <Text key={index} style={{ fontWeight: 'bold', color: colors.primary }}>
              {part}
            </Text>
          ) : (
            <Text key={index}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  const getAnswerSnippet = (answer: string, keyword: string, snippetLength = 80) => {
    const lowerAnswer = answer.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const index = lowerAnswer.indexOf(lowerKeyword);

    if (index !== -1) {
      const start = Math.max(index - snippetLength / 2, 0);
      const end = Math.min(start + snippetLength, answer.length);
      const snippet = answer.substring(start, end);

      return (start > 0 ? '…' : '') + snippet + (end < answer.length ? '…' : '');
    } else {
      // 검색어 없으면 답변 앞부분 자르기
      return answer.substring(0, snippetLength) + (answer.length > snippetLength ? '…' : '');
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? insets.top + 10 : 0,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.sm,
          position: 'relative',
        }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ position: 'absolute', left: 15, padding: 8, zIndex: 1 }}>
          <Ionicons name='arrow-back' size={30} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setCategoryModal(true)}>
            <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.primary }}>
              {selectedCategory.label} ▾
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            setSearchModalVisible(true);
            setTimeout(() => searchInputRef.current?.focus(), 300); // ✅ 모달 열리고 자동 focus
          }}
          style={{ position: 'absolute', right: 15, padding: 8, zIndex: 1 }}>
          <Ionicons name='search' size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={openQuestionModal}
        style={{
          backgroundColor: colors.surface,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
        <Text style={{ fontSize: font.body + 5, fontWeight: '600', color: colors.primary }}>
          문항 {currentIndex + 1} ▾
        </Text>
      </TouchableOpacity>

      {initialized && (
        <PagerView
          key={selectedCategory.key}
          ref={pagerRef}
          style={{ flex: 1 }}
          initialPage={currentIndex}
          onPageSelected={handlePageSelected}>
          {selectedCategory.data.map((item, index) => (
            <View key={index} style={{ padding: spacing.lg }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                  elevation: 3,
                }}>
                <Text
                  style={{
                    fontSize: font.heading,
                    fontWeight: 'bold',
                    color: colors.primary,
                    marginBottom: spacing.md,
                  }}>
                  Q{item.question_number}. {item.question}
                </Text>
                <Text
                  style={{
                    fontSize: font.body * fontScale,
                    color: colors.text,
                    lineHeight: 26 * fontScale,
                  }}>
                  {item.answer}
                </Text>
                {Array.isArray(item.references) && item.references.length > 0 && (
                  <View style={{ marginTop: spacing.lg }}>
                    <Text
                      style={{
                        fontSize: font.caption,
                        fontWeight: 'bold',
                        color: colors.subtext,
                        marginBottom: spacing.sm,
                      }}>
                      📖 성경 참고 구절:
                    </Text>
                    {item.references.map((ref, idx) => (
                      <Text
                        key={idx}
                        style={{
                          fontSize: font.caption,
                          color: colors.subtext,
                          marginLeft: spacing.sm,
                        }}>
                        • {ref}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
        </PagerView>
      )}

      <Modal visible={modalVisible} animationType='slide'>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ alignItems: 'center', paddingTop: spacing.lg, marginBottom: spacing.md }}>
            <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.primary }}>
              {selectedCategory.label}
            </Text>
          </View>
          <FlatList
            ref={flatListRef}
            data={selectedCategory.data}
            keyExtractor={(item) => item.question_number.toString()}
            initialNumToRender={currentIndex + 10}
            getItemLayout={(_, index) => ({
              length: itemHeightRef.current,
              offset: itemHeightRef.current * index,
              index,
            })}
            contentContainerStyle={{
              paddingBottom: Platform.OS === 'android' ? 80 : 40,
            }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onLayout={
                  index === 0
                    ? (e) => {
                        const height = e.nativeEvent.layout.height;
                        if (height && itemHeightRef.current !== height) {
                          itemHeightRef.current = height;
                        }
                      }
                    : undefined
                }
                onPress={() => handleSelect(item.question_number)}
                style={{
                  paddingVertical: spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingHorizontal: spacing.md,
                }}>
                <Text style={{ fontSize: font.body + 2, color: colors.text }}>
                  문 {item.question_number}. {item.question}
                </Text>
              </TouchableOpacity>
            )}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index,
                  viewPosition: Platform.OS === 'ios' ? 0.45 : 0.25,
                  animated: true,
                });
              }, 500);
            }}
          />
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={{
              marginTop: spacing.lg,
              backgroundColor: colors.primary,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              alignItems: 'center',
            }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: font.body }}>닫기</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal visible={categoryModal} animationType='fade' transparent>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.3)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setCategoryModal(false)}
          activeOpacity={1}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 24,
              width: '70%',
            }}>
            {categories.map((cat) => (
              <TouchableOpacity key={cat.key} onPress={() => handleCategoryChange(cat)}>
                <Text
                  style={{
                    color: selectedCategory.key === cat.key ? colors.primary : colors.text,
                    fontSize: 20,
                    fontWeight: '600',
                    paddingVertical: 8,
                  }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={searchModalVisible} animationType='slide'>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {/* 상단바 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
            <Text style={{ fontSize: font.heading, fontWeight: 'bold', flex: 1 }}>
              📖 {selectedCategory.label} 검색
            </Text>
            <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
              <Ionicons name='close' size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* 검색 입력 */}
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
            <TextInput
              ref={searchInputRef}
              placeholder='검색어를 입력하세요'
              placeholderTextColor={colors.subtext}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.sm,
                color: colors.text,
              }}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);

                if (text.trim() === '') {
                  setFilteredResults([]); // 검색어 없으면 비움
                } else {
                  const cleanText = text.trim().toLowerCase();
                  const results = selectedCategory.data.filter(
                    (item) =>
                      item.question.toLowerCase().includes(cleanText) ||
                      item.answer.toLowerCase().includes(cleanText)
                  );
                  setFilteredResults(results);
                }
              }}
            />
          </View>

          {/* 결과 리스트 */}
          <FlatList
            data={filteredResults}
            keyExtractor={(item) => item.question_number.toString()}
            renderItem={({ item }) => {
              const isAnswerMatched = item.answer.toLowerCase().includes(searchQuery.toLowerCase());

              return (
                <TouchableOpacity
                  onPress={() => {
                    handleSelect(item.question_number);
                    setSearchModalVisible(false);
                  }}
                  style={{
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    paddingHorizontal: spacing.md,
                  }}>
                  {/* 질문 표시 */}
                  <Text style={{ fontSize: font.body, color: colors.text }}>
                    {highlightText(`문 ${item.question_number}. ${item.question}`, searchQuery)}
                  </Text>

                  {/* 답변 일부 미리보기 + 하이라이트 */}
                  {isAnswerMatched && (
                    <Text
                      style={{
                        fontSize: font.caption,
                        color: colors.subtext,
                        marginTop: 4,
                      }}
                      numberOfLines={2}
                      ellipsizeMode='tail'>
                      {highlightText(getAnswerSnippet(item.answer, searchQuery), searchQuery)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom,
          right: spacing.xl,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
          elevation: 4,
        }}>
        <TouchableOpacity onPress={() => setFontScale((prev) => Math.max(0.8, prev - 0.1))}>
          <Text
            style={{
              fontSize: 16 * fontScale,
              color: colors.text,
              fontWeight: 'bold',
              paddingHorizontal: 8,
            }}>
            가−
          </Text>
        </TouchableOpacity>

        {/* 구분선 */}
        <View
          style={{
            width: 1,
            height: 20,
            backgroundColor: colors.border,
            marginHorizontal: spacing.xs,
          }}
        />

        <TouchableOpacity onPress={() => setFontScale((prev) => Math.min(1.8, prev + 0.1))}>
          <Text
            style={{
              fontSize: 20 * fontScale,
              color: colors.text,
              fontWeight: 'bold',
              paddingHorizontal: 8,
            }}>
            가+
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
