import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    ScrollView,
    Alert,
    Dimensions,
    Platform,
} from "react-native";
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    serverTimestamp,
    getDocs,
    deleteDoc
} from "firebase/firestore";
import {ref, uploadBytes, getDownloadURL, deleteObject} from "firebase/storage";
import { db, storage } from "@/firebase/config";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {useSafeAreaFrame, useSafeAreaInsets} from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";
import * as MediaLibrary from "expo-media-library";

export default function BulletinPage() {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [selectedBulletin, setSelectedBulletin] = useState<any>(null);
    const [mode, setMode] = useState<"view" | "upload">("view");
    const [title, setTitle] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [imageFiles, setImageFiles] = useState<any[]>([]);
    const [pdfFile, setPdfFile] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    const frame = useSafeAreaFrame();

    // 🚨 관리자 권한 (임시로 true 처리, 실제로는 로그인 유저 role 체크)
    const isAdmin = true;

    useEffect(() => {
        const q = query(collection(db, "bulletins"), orderBy("createdAt", "desc"), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                setSelectedBulletin({
                    id: doc.id,
                    ...doc.data(),
                });
            } else {
                setSelectedBulletin(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('권한 필요', '이미지 라이브러리 접근 권한이 필요합니다.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            setImageFiles(result.assets);
        }
    };

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "application/pdf",
            });
            if (!result.canceled && result.assets?.length > 0) {
                setPdfFile(result.assets[0]);
            }
        } catch (err) {
            console.error("PDF 선택 오류:", err);
        }
    };

    const uploadBulletin = async () => {
        if ((imageFiles.length === 0 && !pdfFile)) {
            Alert.alert("필수 항목 누락", "제목과 파일(이미지 또는 PDF)을 선택하세요.");
            return;
        }

        setUploading(true);
        const uploadedImageUrls: string[] = [];

        try {
            // 🗑 기존 주보 삭제
            const q = query(collection(db, "bulletins"), orderBy("createdAt", "desc"), limit(1));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const docToDelete = snapshot.docs[0];
                const data = docToDelete.data();

                // 🔥 기존 이미지 삭제
                if (data.images && Array.isArray(data.images)) {
                    for (const url of data.images) {
                        const filePath = decodeURIComponent(url.split('/o/')[1].split('?')[0]); // 파일 경로 추출
                        const fileRef = ref(storage, filePath);
                        await deleteObject(fileRef).catch(err => console.log("이미지 삭제 오류:", err));
                    }
                }

                // 🔥 기존 PDF 삭제
                if (data.pdf) {
                    const pdfPath = decodeURIComponent(data.pdf.split('/o/')[1].split('?')[0]);
                    const pdfRef = ref(storage, pdfPath);
                    await deleteObject(pdfRef).catch(err => console.log("PDF 삭제 오류:", err));
                }

                // 🔥 Firestore 문서 삭제
                await deleteDoc(docToDelete.ref);
                console.log("✅ 기존 주보 삭제 완료");
            }

            // ✅ 이미지 업로드
            for (const image of imageFiles) {
                const response = await fetch(image.uri);
                const blob = await response.blob();
                const fileRef = ref(storage, `bulletins/images/${Date.now()}-${image.fileName || "image"}`);
                await uploadBytes(fileRef, blob);
                const downloadUrl = await getDownloadURL(fileRef);
                uploadedImageUrls.push(downloadUrl);
            }

            // ✅ PDF 업로드
            let pdfUrl = null;
            if (pdfFile) {
                const response = await fetch(pdfFile.uri);
                const blob = await response.blob();
                const fileRef = ref(storage, `bulletins/pdfs/${Date.now()}-${pdfFile.name}`);
                await uploadBytes(fileRef, blob);
                pdfUrl = await getDownloadURL(fileRef);
            }

            // ✅ Firestore 저장
            await addDoc(collection(db, "bulletins"), {
                title,
                date: selectedDate.toISOString().split("T")[0],
                images: uploadedImageUrls,
                pdf: pdfUrl,
                createdAt: serverTimestamp(),
            });

            Alert.alert("업로드 완료", "주보가 성공적으로 업로드되었습니다.");
            setMode("view");
            setTitle("");
            setImageFiles([]);
            setPdfFile(null);
        } catch (err) {
            console.error("❌ 업로드 중 오류:", err);
            Alert.alert("업로드 실패", "주보 업로드 중 문제가 발생했습니다.");
        } finally {
            setUploading(false);
        }
    };

    const saveImageToGallery = async (url: string, filename: string) => {
        try {
            // 📸 미디어 라이브러리 권한 요청
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("권한 필요", "사진을 저장하려면 접근 권한이 필요합니다.");
                return;
            }

            // 📥 이미지 다운로드
            const fileUri = FileSystem.documentDirectory + filename;
            const downloadResult = await FileSystem.downloadAsync(url, fileUri);
            console.log("✅ 다운로드 완료:", downloadResult.uri);

            // 📂 앨범에 저장
            const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
            await MediaLibrary.createAlbumAsync("Bulletins", asset, false);

            Alert.alert("저장 성공", "이미지가 앨범에 저장되었습니다.");
        } catch (err) {
            console.error("❌ 저장 실패:", err);
            Alert.alert("저장 오류", "이미지를 앨범에 저장할 수 없습니다.");
        }
    };


    const handleDownloadAndShare = async (url: string, filename: string) => {
        try {
            // 1. 파일 다운로드
            const fileUri = FileSystem.documentDirectory + filename;
            const downloaded = await FileSystem.downloadAsync(url, fileUri);

            console.log("📥 파일 다운로드 완료:", downloaded.uri);

            // 2. 공유 시트 열기
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloaded.uri);
            } else {
                Alert.alert("공유 불가", "이 디바이스에서 공유 기능을 지원하지 않습니다.");
            }
        } catch (err) {
            console.error("❌ 파일 다운로드/공유 실패:", err);
            Alert.alert("오류", "파일을 다운로드하거나 공유하는 데 실패했습니다.");
        }
    };

    const renderViewMode = () => (
        <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
            {/* 🔥 상단 헤더 */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between", // 좌우 균형
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderColor: "#eee",
                }}
            >
                {/* 🔙 뒤로가기 버튼 */}
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>

                {/* 📅 날짜 */}
                {selectedBulletin ? (
                    <Text
                        style={{
                            fontSize: 24,
                            fontWeight: "600",
                            color: "#333",
                        }}
                    >
                        {selectedBulletin.date} 주보
                    </Text>
                ) : (
                    <ActivityIndicator size="small" color="#888" />
                )}

                {/* 🔥 오른쪽에 공간 확보용 뷰 */}
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
            ) : selectedBulletin ? (
                <ScrollView contentContainerStyle={{ padding: 16 }}>

                    {/* 🖼 이미지 미리보기 */}
                    {selectedBulletin.images && selectedBulletin.images.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            {selectedBulletin.images.map((imgUrl: string, idx: number) => (
                                <View key={idx} style={{ marginRight: 16 }}>
                                    <Image
                                        source={{ uri: imgUrl }}
                                        style={{
                                            width: frame.width* 0.8,
                                            height: frame.height * 0.6,
                                            borderRadius: 8,
                                        }}
                                    />
                                    <TouchableOpacity
                                        onPress={() => saveImageToGallery(imgUrl, `bulletin_${idx + 1}.jpg`)}
                                        style={{
                                            backgroundColor: "#28a745",
                                            padding: 10,
                                            borderRadius: 8,
                                            alignItems: "center",
                                            marginTop: 10,
                                        }}
                                    >
                                        <Text style={{ color: "#fff", fontSize: 16 }}>📥 이미지 저장</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* 📄 PDF 다운로드 */}
                    <TouchableOpacity
                        onPress={() => handleDownloadAndShare(selectedBulletin.pdf, "bulletin.pdf")}
                        style={{
                            backgroundColor: "#007AFF",
                            padding: 12,
                            borderRadius: 8,
                            alignItems: "center",
                            marginVertical: 10,
                        }}
                    >
                        <Text style={{ color: "#fff", fontSize: 16 }}>📥 PDF 다운로드 및 공유</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <Text style={{ textAlign: "center", marginTop: 50, color: "#999" }}>
                    등록된 주보가 없습니다.
                </Text>
            )}

            {/* ✅ 관리자 업로드 버튼 */}
            {isAdmin && (
                <TouchableOpacity
                    onPress={() => setMode("upload")}
                    style={{
                        position: "absolute",
                        bottom: 30,
                        right: 30,
                        backgroundColor: "#007AFF",
                        borderRadius: 30,
                        padding: 16,
                        elevation: 4,
                    }}
                >
                    <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderUploadMode = () => (
        <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top + 10 }}>
            <TouchableOpacity onPress={() => setMode("view")} style={{ margin: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>📤 주보 업로드</Text>

                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 16, borderBottomWidth: 1, paddingBottom: 8 }}>
                        📅 {selectedDate.toISOString().split("T")[0]}
                    </Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display={Platform.OS === "ios" ? "inline" : "default"}
                        onChange={(event, date) => {
                            setShowDatePicker(false);
                            if (date) setSelectedDate(date);
                        }}
                    />
                )}

                <TouchableOpacity onPress={pickImage} style={{ marginBottom: 10 }}>
                    <Text style={{ color: "#007AFF", fontSize: 16 }}>🖼 이미지 선택</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickFile} style={{ marginBottom: 20 }}>
                    <Text style={{ color: "#007AFF", fontSize: 16 }}>📄 PDF 선택</Text>
                </TouchableOpacity>

                {/* 이미지 미리보기 */}
                {imageFiles.length > 0 && (
                    <ScrollView horizontal style={{ marginBottom: 10 }}>
                        {imageFiles.map((img, idx) => (
                            <Image
                                key={idx}
                                source={{ uri: img.uri }}
                                style={{ width: 100, height: 100, marginRight: 8, borderRadius: 8 }}
                            />
                        ))}
                    </ScrollView>
                )}

                {/* PDF 미리보기 */}
                {pdfFile && (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 10,
                        backgroundColor: "#f0f0f0",
                        borderRadius: 8,
                        padding: 10,
                    }}>
                        <Ionicons name="document-text-outline" size={40} color="#888" style={{ marginRight: 10 }} />
                        <Text numberOfLines={1} style={{ flex: 1 }}>{pdfFile.name}</Text>
                    </View>
                )}

                {/* 업로드 버튼 */}
                {uploading ? (
                    <ActivityIndicator size="large" color="#007AFF" />
                ) : (
                    <TouchableOpacity
                        onPress={uploadBulletin}
                        style={{
                            backgroundColor: "#007AFF",
                            padding: 15,
                            borderRadius: 8,
                            alignItems: "center",
                        }}
                    >
                        <Text style={{ color: "#fff", fontSize: 16 }}>업로드</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );

    console.log(selectedBulletin)

    return mode === "upload" ? renderUploadMode() : renderViewMode();
}
