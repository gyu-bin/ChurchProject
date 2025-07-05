import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { useState } from "react";
import { Alert } from "react-native";

export default function usePickImage() {
  const [imageURLs, setImageURLs] = useState<ImagePickerAsset[]>([]);

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "이미지 라이브러리에 접근 권한이 필요합니다.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        // 기존 이미지 포함 최대 5장까지 제한
        const newImages = [...imageURLs, ...result.assets].slice(0, 5);
        setImageURLs(newImages);
        console.log("📸 선택된 이미지:", newImages.length, "장");
      }
    } catch (error) {
      console.error("📸 이미지 선택 오류:", error);
      Alert.alert("오류", "이미지 선택 중 오류가 발생했습니다.");
    }
  };

  return { imageURLs, setImageURLs, pickImage };
}
