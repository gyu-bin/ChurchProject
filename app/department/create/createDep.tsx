import {
    CampusWithAll,
    DepartmentWithAll,
} from "@/app/constants/CampusDivisions";
import CampusDivisionSelect from "@/components/ui/division/CampusDivisionSelect";
import DepartmentSelect from "@/components/ui/division/DepartmentSelect";
import UserInitializer from "@/components/user/UserInitializer";
import { User } from "@/constants/_types/user";
import { useDesign } from "@/context/DesignSystem";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styled from "styled-components/native";
import usePickImage from "./uesPickImage";
import useUploadDepartmentPost from "./useUploadDepartmentPost";

export default function DepartmentPostCreate() {
  const { colors, spacing, font } = useDesign();
  const insets = useSafeAreaInsets();

  // TODO 사용자 캠퍼스로 초기 셋팅하기
  const [selectedCampus, setSelectedCampus] = useState<CampusWithAll | null>(
    null
  );
  const [selectedDivision, setSelectedDivision] =
    useState<DepartmentWithAll | null>(null);

  const [userInfo, setUserInfo] = useState<User | null>(null);

  const { imageURLs, setImageURLs, pickImage } = usePickImage();
  const [content, setContent] = useState("");

  const { uploading, error, uploadPost } = useUploadDepartmentPost({
    imageURLs,
    setImageURLs,
    selectedCampus,
    selectedDivision,
    userInfo,
    content,
    setContent,
  });

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
      contentContainerStyle={{ padding: spacing.md }}
    >
      <UserInitializer setUserInfo={setUserInfo} />
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing.lg,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontSize: font.title,
              fontWeight: "bold",
              color: colors.text,
            }}
          >
            게시글 생성
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* 캠퍼스 드롭다운 */}
      <SelectWrapper>
        <CampusDivisionSelect
          selectedCampus={selectedCampus}
          onCampusChange={setSelectedCampus}
        />
        <DepartmentSelect
          selectedCampus={selectedCampus || "ALL"}
          selectedDepartment={selectedDivision}
          onDepartmentChange={setSelectedDivision}
        />
      </SelectWrapper>
      <TouchableOpacity
        style={{
          backgroundColor: "#f3f4f6",
          borderWidth: 1,
          borderColor: "#d1d5db",
          padding: spacing.md,
          borderRadius: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
          marginBottom: spacing.md,
        }}
        onPress={pickImage}
      >
        <Ionicons name="camera-outline" size={20} color="#3b82f6" />
        <Text style={{ color: "#3b82f6", fontWeight: "600" }}>
          사진 선택 (최대 5장)
        </Text>
      </TouchableOpacity>

      <FlatList
        data={imageURLs}
        keyExtractor={(item) => item.uri}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() =>
              Alert.alert("사진 삭제", "이 사진을 삭제하시겠습니까?", [
                { text: "취소", style: "cancel" },
                {
                  text: "삭제",
                  style: "destructive",
                  onPress: () =>
                    setImageURLs((prev) =>
                      prev.filter((img) => img.uri !== item.uri)
                    ),
                },
              ])
            }
          >
            <Image
              source={{ uri: item.uri }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                marginRight: 10,
              }}
            />
          </TouchableOpacity>
        )}
      />

      <TextInput
        placeholder="내용을 입력해주세요..."
        value={content}
        onChangeText={setContent}
        multiline
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: 12,
          padding: spacing.md,
          fontSize: 15,
          minHeight: 120,
          textAlignVertical: "top",
          marginBottom: spacing.lg,
        }}
      />

      <TouchableOpacity
        onPress={uploadPost}
        disabled={uploading}
        style={{
          backgroundColor: uploading ? "#ccc" : "#2563eb",
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
            🚀 등록하기
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const SelectWrapper = styled.View`
  display: flex;
  flex-direction: row;
  gap: 12px;
  margin-bottom: 12px;
`;
