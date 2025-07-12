import ScreenContainer from '@/components/_common/ScreenContainer';
import { setScrollCallback } from '@/utils/scrollRefManager';
import useDepartmentFilter from '@components/department/main/_hooks/useDepartmentFilter';
import DepartmentFilterModal from '@components/department/main/filterModal/DepartmentFilterModal';
import DepartmentHeader from '@components/department/main/header/DepartmentHeader';
import DepartmentPostList from '@components/department/main/list/DepartmentPostList';
import React, { useEffect, useRef } from 'react';
import { FlatList } from 'react-native';

export default function DepartmentsScreen() {
  const mainListRef = useRef<FlatList>(null);

  useEffect(() => {
    setScrollCallback('departments', () => {
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
    <ScreenContainer paddingHorizontal={0} paddingBottom={0}>
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
    </ScreenContainer>
  );
}
