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

  const {
    selectedCampus,
    selectedDept,
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
      <DepartmentPostList
        selectedCampus={selectedCampus}
        selectedDivision={selectedDept}
      />
      <DepartmentFilterModal
        isOpen={isOpenFilter}
        setIsOpen={setIsOpenFilter}
        resetFilter={resetFilter}
        applyFilter={applyFilter}
        selectedCampus={selectedCampus}
        selectedDept={selectedDept}
      />
    </SafeAreaView>
  );
}
