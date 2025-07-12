import { Campus, Department } from '@/app/constants/CampusDivisions';
import { useState } from 'react';

export default function useDepartmentFilter() {
  const [isOpenFilter, setIsOpenFilter] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<Campus | 'ALL'>('ALL');
  const [selectedDept, setSelectedDept] = useState<Department | 'ALL'>('ALL');

  const openFilter = () => {
    setIsOpenFilter(true);
  };

  const applyFilter = ({
    tempCampus,
    tempDept,
  }: {
    tempCampus: Campus | 'ALL';
    tempDept: Department | 'ALL';
  }) => {
    setSelectedCampus(tempCampus);
    setSelectedDept(tempDept);
    // setVisibleCount(5);
    setIsOpenFilter(false);
  };
  const resetFilter = () => {
    setSelectedCampus('ALL');
    setSelectedDept('ALL');
  };

  return {
    isOpenFilter,
    setIsOpenFilter,
    applyFilter,
    resetFilter,
    selectedCampus,
    setSelectedCampus,
    selectedDept,
    setSelectedDept,
    openFilter,
  };
}
