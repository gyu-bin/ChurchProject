import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useDesign } from "@/context/DesignSystem";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Campus,
  CAMPUS_ENUM,
  Department,
  DEPARTMENT_ENUM,
} from "@/app/constants/CampusDivisions";
import { isAll } from "../../utils/isAll";

type DepartmentHeaderProps = {
  selectedCampus: Campus | "ALL";
  selectedDept: Department | "ALL";
  openFilter: () => void;
  setViewType: (viewType: "card" | "feed") => void;
  viewType: "card" | "feed";
};

export default function DepartmentHeader({
  selectedCampus,
  selectedDept,
  openFilter,
  setViewType,
  viewType,
}: DepartmentHeaderProps) {
  const { colors, spacing, font } = useDesign();
  const router = useRouter();

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
          backgroundColor: colors.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: font.heading + 10,
            fontWeight: "bold",
            color: colors.text,
          }}
        >
          부서활동
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={openFilter}
            style={{
              marginRight: 8,
              backgroundColor: colors.background,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 7,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="filter" size={18} color={colors.primary} />
            <Text
              style={{
                color: colors.primary,
                fontWeight: "bold",
                fontSize: 14,
                marginLeft: 4,
              }}
            >
              필터
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/department/create/createDep")}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 18,
              padding: 2,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      {/* 선택된 교회/부서 표시 (탭처럼) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          marginTop: spacing.sm,
          marginBottom: spacing.sm,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              backgroundColor:
                isAll(selectedCampus) && isAll(selectedDept)
                  ? colors.primary
                  : colors.background,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor:
                isAll(selectedCampus) && isAll(selectedDept)
                  ? colors.primary
                  : colors.border,
            }}
          >
            <Text
              style={{
                color:
                  isAll(selectedCampus) && isAll(selectedDept)
                    ? "#fff"
                    : colors.text,
                fontWeight: "600",
                fontSize: 15,
              }}
            >
              전체 피드
            </Text>
          </View>
          {(!isAll(selectedCampus) || !isAll(selectedDept)) && (
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: colors.primary,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                {CAMPUS_ENUM[selectedCampus]}
                {!isAll(selectedDept)
                  ? " · " + DEPARTMENT_ENUM[selectedDept]
                  : ""}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setViewType(viewType === "card" ? "feed" : "card")}
        >
          <Ionicons
            name={viewType === "card" ? "grid-outline" : "list-outline"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
