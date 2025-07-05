import { useDesign } from "@/context/DesignSystem";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, Platform, SafeAreaView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setScrollCallback } from "@/utils/scrollRefManager";
import DepartmentHeader from "../department/header/DepartmentHeader";
import useDepartmentFilter from "../department/_hooks/useDepartmentFilter";
import DepartmentFilterModal from "../department/filterModal/DepartmentFilterModal";
import DepartmentPostList from "../department/list/DepartmentPostList";

export default function DepartmentsScreen() {
  const { colors } = useDesign();

  const insets = useSafeAreaInsets();
  const mainListRef = useRef<FlatList>(null);

  useEffect(() => {
    setScrollCallback("departments", () => {
      mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

  // NEW
  const [viewType, setViewType] = useState<"card" | "feed">("card");

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
        setViewType={setViewType}
        viewType={viewType}
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
      <DepartmentPostList
        selectedCampus={selectedCampus}
        selectedDivision={selectedDept}
        viewType={viewType}
      />

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
