import {
  CAMPUS_DIVISIONS,
  Campus,
  CampusWithAll,
  DEPARTMENT_ENUM,
  DEPARTMENT_WITH_ALL,
  DepartmentWithAll,
} from "@/app/constants/CampusDivisions";
import CustomDropdown from "@/components/dropDown";
import { useDesign } from "@/context/DesignSystem";
import React from "react";
import { View } from "react-native";

interface DepartmentSelectProps {
  selectedCampus: CampusWithAll;
  selectedDepartment: DepartmentWithAll | null;
  onDepartmentChange: (department: DepartmentWithAll) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function DepartmentSelect({
  selectedCampus,
  selectedDepartment,
  onDepartmentChange,
  placeholder = "부서를 선택하세요",
  disabled = false,
}: DepartmentSelectProps) {
  const { colors, radius } = useDesign();

  const getAvailableDepartments = () => {
    if (!selectedDepartment) {
      return Object.entries(DEPARTMENT_ENUM).map(([key, label]) => ({
        label,
        value: key,
      }));
    }

    const availableDepts =
      selectedCampus === "ALL"
        ? DEPARTMENT_WITH_ALL
        : CAMPUS_DIVISIONS[selectedCampus as Campus];

    return availableDepts.map((dept) => ({
      label: DEPARTMENT_ENUM[dept],
      value: dept,
    }));
  };

  const departmentOptions = getAvailableDepartments();

  const handleDepartmentChange = (item: { label: string; value: string }) => {
    onDepartmentChange(item.value as DepartmentWithAll);
  };

  return (
    <View style={{ display: "flex", flex: 1 }}>
      <CustomDropdown
        data={departmentOptions}
        value={selectedDepartment || ""}
        onChange={handleDepartmentChange}
        placeholder={placeholder}
        disabled={disabled}
        maxHeight={400}
        containerStyle={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.md,
          height: 52,
        }}
        textStyle={{
          color: colors.text,
        }}
      />
    </View>
  );
}
