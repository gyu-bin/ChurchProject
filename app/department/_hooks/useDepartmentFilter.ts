import { Campus, Department } from "@/app/constants/CampusDivisions";
import { useState } from "react";

export default function useDepartmentFilter() {
  const [isOpenFilter, setIsOpenFilter] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<Campus | "ALL">("ALL");
  const [selectedDept, setSelectedDept] = useState<Department | "ALL">("ALL");

  const [tempCampus, setTempCampus] = useState(selectedCampus);
  const [tempDept, setTempDept] = useState(selectedDept);

  const openFilter = () => {
    setTempCampus(selectedCampus);
    setTempDept(selectedDept);
    setIsOpenFilter(true);
  };
  const applyFilter = () => {
    setSelectedCampus(tempCampus);
    setSelectedDept(tempDept);
    // setVisibleCount(5);
    setIsOpenFilter(false);
  };
  const resetFilter = () => {
    setTempCampus("ALL");
    setTempDept("ALL");
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
