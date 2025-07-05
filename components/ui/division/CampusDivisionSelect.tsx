import { CAMPUS_ENUM, CampusWithAll } from "@/app/constants/CampusDivisions";
import CustomDropdown from "@/components/dropDown";
import { useDesign } from "@/context/DesignSystem";
import React from "react";
import { View } from "react-native";

interface CampusDivisionSelectProps {
  selectedCampus: CampusWithAll | null;
  onCampusChange: (campus: CampusWithAll) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function CampusDivisionSelect({
  selectedCampus,
  onCampusChange,
  placeholder = "캠퍼스를 선택하세요",
  disabled = false,
}: CampusDivisionSelectProps) {
  const { colors, radius } = useDesign();

  const campusOptions = Object.entries(CAMPUS_ENUM).map(([key, label]) => ({
    label,
    value: key,
  }));

  const handleCampusChange = (item: { label: string; value: string }) => {
    onCampusChange(item.value as CampusWithAll);
  };

  return (
    <View style={{ display: "flex", flex: 1 }}>
      <CustomDropdown
        data={campusOptions}
        value={selectedCampus || ""}
        onChange={handleCampusChange}
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
