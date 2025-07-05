// screens/DepartmentsScreen.tsx

import { useDesign } from "@/context/DesignSystem";
import { useAppTheme } from "@/context/ThemeContext";
import React, { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Platform, SafeAreaView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setScrollCallback } from "@/utils/scrollRefManager";
import { CAMPUS_DIVISIONS } from "@/app/constants/CampusDivisions";
import DepartmentHeader from "../department/header/DepartmentHeader";
import useDepartmentFilter from "../department/_hooks/useDepartmentFilter";
import DepartmentFilterModal from "../department/filterModal/DepartmentFilterModal";

const FEED_COLORS = [
  "#a1c4fd",
  "#fbc2eb",
  "#fddb92",
  "#f6d365",
  "#84fab0",
  "#fccb90",
  "#e0c3fc",
];
const WRITERS = ["홍길동", "김영희", "이철수", "박민수", "최지은", "정수빈"];
const CONTENTS = [
  "오늘 모임 너무 즐거웠어요! 모두 수고하셨습니다.",
  "다음 주 일정은 어떻게 되나요?",
  "새로운 친구가 왔어요! 환영해주세요.",
  "기도제목 있으신 분 댓글로 남겨주세요!",
  "이번 주는 야외예배입니다!",
  "맛있는 간식 감사합니다 :)",
  "다들 건강 조심하세요~",
];
const TIMES = ["2시간 전", "5분 전", "1일 전", "30분 전", "3일 전", "1주 전"];
const FEED_DEPTS = [
  { name: "유치부", campus: "신촌캠퍼스" },
  { name: "초등부", campus: "신촌캠퍼스" },
  { name: "중고등부", campus: "문래캠퍼스" },
  { name: "청년1부", campus: "문래캠퍼스" },
  { name: "청년2부", campus: "시선교회" },
  { name: "장년부", campus: "시선교회" },
];
// 샘플 피드 20개 랜덤 생성
const FEEDS = Array.from({ length: 100 }).map((_, i) => {
  const dept = FEED_DEPTS[Math.floor(Math.random() * FEED_DEPTS.length)];
  return {
    id: `feed-${i}`,
    dept: dept.name,
    campus: dept.campus,
    color: FEED_COLORS[i % FEED_COLORS.length],
    writer: WRITERS[Math.floor(Math.random() * WRITERS.length)],
    time: TIMES[Math.floor(Math.random() * TIMES.length)],
    content: CONTENTS[Math.floor(Math.random() * CONTENTS.length)],
  };
});

export default function DepartmentsScreen() {
  const [visibleCount, setVisibleCount] = useState(5);
  const [loadingMore, setLoadingMore] = useState(false);
  const { mode } = useAppTheme();
  const { colors, font, spacing, radius } = useDesign();
  const isDark = mode === "dark";

  const slideX = useRef(new Animated.Value(0)).current;

  const campuses = Object.keys(CAMPUS_DIVISIONS);

  const insets = useSafeAreaInsets();
  const mainListRef = useRef<FlatList>(null);
  // const filtered = FEEDS.filter(
  //   (f) =>
  //     (selectedCampus === "전체" || f.campus === selectedCampus) &&
  //     (selectedDept === "전체" || f.dept === selectedDept)
  // );
  // const visibleFeeds = filtered.slice(0, visibleCount);
  // console.log(visibleFeeds);

  useEffect(() => {
    setScrollCallback("departments", () => {
      mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

  // const handleLoadMore = () => {
  //   if (loadingMore) return;
  //   if (visibleCount >= filtered.length) return;
  //   setLoadingMore(true);
  //   setTimeout(() => {
  //     setVisibleCount((prev) => Math.min(prev + 5, filtered.length));
  //     setLoadingMore(false);
  //   }, 300);
  // };

  // NEW

  const {
    selectedCampus,
    selectedDept,
    setSelectedCampus,
    setSelectedDept,
    openFilter,
    isOpenFilter,
    applyFilter,
    resetFilter,
    setIsOpenFilter,
  } = useDepartmentFilter();
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === "android" ? insets.top : 0,
      }}
    >
      <DepartmentHeader
        selectedCampus={selectedCampus}
        selectedDept={selectedDept}
        openFilter={openFilter}
      />

      {/* 피드 리스트 */}
      {/* <FlatList
        data={visibleFeeds}
        ref={mainListRef}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 18 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              shadowColor: "#000",
              shadowOpacity: 0.07,
              shadowRadius: 10,
              elevation: 2,
              marginBottom: 0,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 300,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
                backgroundColor: item.color,
              }}
            />
            <View style={{ padding: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontWeight: "bold",
                    color: colors.primary,
                    fontSize: 16,
                  }}
                >
                  {item.dept}
                </Text>
                <Text
                  style={{
                    color: colors.subtext,
                    marginLeft: 10,
                    fontSize: 13,
                  }}
                >
                  {item.campus}
                </Text>
                <Text
                  style={{
                    color: colors.subtext,
                    marginLeft: 10,
                    fontSize: 13,
                  }}
                >
                  {item.time}
                </Text>
              </View>
              <Text
                numberOfLines={3}
                style={{
                  color: colors.text,
                  fontSize: 16,
                  marginBottom: 8,
                  lineHeight: 22,
                }}
              >
                {item.content}
              </Text>
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginVertical: 6,
                  opacity: 0.12,
                }}
              />
              <Text style={{ color: colors.subtext, fontSize: 13 }}>
                {item.writer}
              </Text>
            </View>
          </View>
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ color: colors.subtext }}>불러오는 중...</Text>
            </View>
          ) : null
        }
      /> */}

      <DepartmentFilterModal
        isOpen={isOpenFilter}
        setIsOpen={setIsOpenFilter}
        resetFilter={resetFilter}
        applyFilter={applyFilter}
        setCampus={setSelectedCampus}
        setDept={setSelectedDept}
        selectedCampus={selectedCampus}
        selectedDept={selectedDept}
      />
    </SafeAreaView>
  );
}
