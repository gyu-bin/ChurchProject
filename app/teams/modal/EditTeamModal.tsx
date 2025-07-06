import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Image,
    ScrollView,
    Switch,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

type Category = {
    label: string;
    value: string;
};

type EditTeamModalProps = {
    visible: boolean;
    onClose: () => void;
    onSave: () => void | Promise<void>;
    imageURLs: { uri: string }[];
    pickImage: () => void;
    editName: string;
    setEditName: (text: string) => void;
    editDescription: string;
    setEditDescription: (text: string) => void;
    openContact: string;
    setOpenContact: (text: string) => void;
    announcement: string;
    setAnnouncement: (text: string) => void;
    editCapacity: string;
    setEditCapacity: (text: string) => void;
    isUnlimited: boolean;
    setIsUnlimited: (value: boolean) => void;
    category: string;
    setCategory: (value: string) => void;
    isClosed: boolean;
    setIsClosed: (value: boolean) => void;
    expirationDate: Date;
    setExpirationDate: (date: Date) => void;
    colors: {
        surface: string;
        text: string;
        border: string;
        primary: string;
        subtext: string;
    };
    spacing: {
        sm: number;
        md: number;
        lg: number;
    };
    radius: {
        sm: number;
        md: number;
        lg: number;
    };
};

const categories: Category[] = [
    { label: '✨ 반짝소모임', value: '✨ 반짝소모임' },
    { label: '🏃 운동/스포츠', value: '운동/스포츠' },
    { label: '📚 책모임', value: '책모임' },
    { label: '🎮 게임', value: '게임' },
    { label: '🎭 문화생활', value: '문화생활' },
    { label: '🤝 봉사', value: '봉사' },
    { label: '📖 스터디', value: '스터디' },
    { label: '🐾 동물', value: '동물' },
    { label: '🍳 요리/제조', value: '요리/제조' },
];

export default function EditTeamModal({
                                          visible,
                                          onClose,
                                          onSave,
                                          imageURLs,
                                          pickImage,
                                          editName,
                                          setEditName,
                                          editDescription,
                                          setEditDescription,
                                          openContact,
                                          setOpenContact,
                                          announcement,
                                          setAnnouncement,
                                          editCapacity,
                                          setEditCapacity,
                                          isUnlimited,
                                          setIsUnlimited,
                                          category,
                                          setCategory,
                                          isClosed,
                                          setIsClosed,
                                          expirationDate,
                                          setExpirationDate,
                                          colors,
                                          spacing,
                                          radius,
                                      }: EditTeamModalProps) {
    const [localIsClosed, setLocalIsClosed] = useState(isClosed);
    const [localCategory, setLocalCategory] = useState(category);
    const [localExpirationDate, setLocalExpirationDate] = useState(expirationDate);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [calendarVisible, setCalendarVisible] = useState(false);

    // 모달 열릴 때 부모 상태 초기화
    useEffect(() => {
        if (visible) {
            setLocalIsClosed(isClosed);
            setLocalCategory(category);
            setLocalExpirationDate(expirationDate);
        }
    }, [visible]);

    const handleSave = () => {
        setIsClosed(localIsClosed);
        setCategory(localCategory);
        setExpirationDate(localExpirationDate);
        onSave();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg }}>
                            {/* 썸네일 선택 */}
                            <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center', marginBottom: spacing.md }}>
                                {imageURLs.length ? (
                                    <Image
                                        source={{ uri: imageURLs[0].uri }}
                                        style={{ width: '90%', height: 100, borderRadius: 12, marginBottom: 8 }}
                                    />
                                ) : (
                                    <View
                                        style={{
                                            width: 100,
                                            height: 100,
                                            borderRadius: 12,
                                            backgroundColor: '#eee',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Ionicons name="image-outline" size={40} color={colors.subtext} />
                                    </View>
                                )}
                                <Text style={{ color: colors.primary, fontSize: 12 }}>썸네일 선택</Text>
                            </TouchableOpacity>

                            {/* 입력 필드 */}
                            {[
                                { label: '모임명', value: editName, onChangeText: setEditName },
                                { label: '모임 소개', value: editDescription, onChangeText: setEditDescription, multiline: true },
                                { label: '오픈카톡/연락처', value: openContact, onChangeText: setOpenContact, multiline: true },
                                { label: '공지사항', value: announcement, onChangeText: setAnnouncement, multiline: true },
                            ].map((item, index) => (
                                <View key={index} style={{ marginBottom: spacing.md }}>
                                    <Text style={{ color: colors.text, marginBottom: 4 }}>{item.label}</Text>
                                    <TextInput
                                        value={item.value}
                                        onChangeText={item.onChangeText}
                                        multiline={item.multiline}
                                        style={{
                                            borderColor: colors.border,
                                            borderWidth: 1,
                                            borderRadius: radius.sm,
                                            padding: spacing.sm,
                                            color: colors.text,
                                        }}
                                    />
                                </View>
                            ))}

                            {/* 최대 인원수 */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                                <TextInput
                                    value={isUnlimited ? '무제한' : editCapacity}
                                    onChangeText={setEditCapacity}
                                    keyboardType="number-pad"
                                    editable={!isUnlimited}
                                    style={{
                                        flex: 1,
                                        backgroundColor: colors.surface,
                                        padding: spacing.md,
                                        borderRadius: radius.md,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        color: colors.text,
                                        opacity: isUnlimited ? 0.5 : 1,
                                    }}
                                />
                                <TouchableOpacity
                                    onPress={() => setIsUnlimited(!isUnlimited)}
                                    style={{
                                        marginLeft: 12,
                                        padding: 10,
                                        borderRadius: 8,
                                        backgroundColor: isUnlimited ? colors.primary + '20' : '#f0f0f0',
                                    }}
                                >
                                    <Text style={{ color: isUnlimited ? colors.primary : colors.text }}>무제한</Text>
                                </TouchableOpacity>
                            </View>

                            {/* 카테고리 선택 */}
                            <TouchableOpacity
                                onPress={() => setCategoryModalVisible(true)}
                                style={{
                                    backgroundColor: colors.surface,
                                    padding: spacing.md,
                                    borderRadius: radius.md,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    marginBottom: spacing.md,
                                }}
                            >
                                <Text style={{ color: colors.text, fontSize: 14 }}>
                                    {category ? `카테고리: ${category}` : '카테고리를 선택하세요'}
                                </Text>
                            </TouchableOpacity>

                            {/* 반짝소모임 날짜 선택 */}
                            {category === '✨ 반짝소모임' && (
                                <TouchableOpacity
                                    onPress={() => setCalendarVisible(true)}
                                    style={{
                                        backgroundColor: colors.surface,
                                        padding: spacing.md,
                                        borderRadius: radius.md,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        marginBottom: spacing.md,
                                    }}
                                >
                                    <Text style={{ color: colors.text, fontSize: 14 }}>
                                        {`모임 종료 날짜: ${expirationDate.toLocaleDateString()}`}
                                    </Text>
                                    <Text style={{ color: colors.subtext, fontSize: 12 }}>
                                        선택한 날짜 다음날 모임이 삭제됩니다.
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* 모임 마감 */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.sm }}>
                                <Text style={{ color: colors.text }}>모임 마감</Text>
                                <Switch
                                    value={localIsClosed}
                                    onValueChange={setLocalIsClosed}
                                    trackColor={{ false: '#ccc', true: colors.primary + '88' }}
                                    thumbColor={localIsClosed ? colors.primary : '#f4f3f4'}
                                />
                            </View>

                            {/* 버튼 */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg }}>
                                <TouchableOpacity onPress={onClose}>
                                    <Text style={{ color: colors.subtext }}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSave}>
                                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>저장</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            {/* 카테고리 모달 */}
            <Modal visible={categoryModalVisible} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, width: '80%' }}>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat.value}
                                onPress={() => {
                                    setCategory(cat.value);
                                    setCategoryModalVisible(false);
                                }}
                                style={{ paddingVertical: 12, borderBottomColor: colors.border, borderBottomWidth: 1 }}
                            >
                                <Text style={{ color: colors.text, fontSize: 14 }}>{cat.label}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={{ marginTop: spacing.md, alignItems: 'center' }}>
                            <Text style={{ color: colors.primary }}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 날짜 캘린더 */}
            <Modal visible={calendarVisible} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, width: '90%' }}>
                        <Calendar
                            onDayPress={day => {
                                setExpirationDate(new Date(day.dateString));
                                setCalendarVisible(false);
                            }}
                            markedDates={{
                                [expirationDate.toISOString().split('T')[0]]: {
                                    selected: true,
                                    marked: true,
                                    selectedColor: colors.primary,
                                },
                            }}
                            theme={{
                                backgroundColor: colors.surface,
                                calendarBackground: colors.surface,
                                textSectionTitleColor: colors.text,
                                dayTextColor: colors.text,
                                monthTextColor: colors.text,
                                selectedDayTextColor: '#fff',
                                selectedDayBackgroundColor: colors.primary,
                                arrowColor: colors.primary,
                            }}
                        />
                        <TouchableOpacity onPress={() => setCalendarVisible(false)} style={{ marginTop: spacing.md, alignItems: 'center' }}>
                            <Text style={{ color: colors.primary }}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}
