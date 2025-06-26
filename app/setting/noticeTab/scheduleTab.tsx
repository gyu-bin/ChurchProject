// ScheduleTab.tsx
import { useDesign } from '@/context/DesignSystem';
import { db } from '@/firebase/config';
import {addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-root-toast";

export default function ScheduleTab() {
    const { colors, spacing } = useDesign();
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState({
        title: '',
        place: '',
        startDate: '',
        endDate: '',
        campus: '',
        division: '',
        id: '',
    });
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [isSelectingStart, setIsSelectingStart] = useState(true);
    const [tempStart, setTempStart] = useState<Date | null>(null);
    const [tempEnd, setTempEnd] = useState<Date | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [scheduleList, setScheduleList] = useState<any[]>([]);

    const campuses = ['전체','문래', '신촌', '시선교회'];
    const divisions = ['전체','유치부', '초등부', '중고등부', '청년1부', '청년2부', '장년부'];

    const getMarkedRange = (start: Date, end: Date) => {
        const range: any = {};
        const current = new Date(start);
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            range[dateStr] = { color: colors.primary, textColor: '#fff' };
            current.setDate(current.getDate() + 1);
        }
        return range;
    };

    const fetchSchedules = async () => {
        const q = query(collection(db, 'notice'), where('type', '==', 'event'));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setScheduleList(list);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSchedules();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchSchedules();
    }, []);

    const handleSave = async () => {
        if (!form.title || !form.place || !form.startDate || !form.endDate) {
            Alert.alert('모든 필드를 입력해주세요');
            return;
        }

        const payload = {
            title: form.title,
            place: form.place,
            startDate: new Date(form.startDate),
            endDate: new Date(form.endDate),
            division: form.division,
            campus: form.campus,
            type: 'event',
        };

        if (form.id) {
            await updateDoc(doc(db, 'notice', form.id), payload);
        } else {
            await addDoc(collection(db, 'notice'), payload);
        }
        Toast.show('수정되었습니다.')
        setModalVisible(false);
        setForm({ title: '', place: '', startDate: '', endDate: '', division: '', campus: '',id: '' });
        fetchSchedules();
    };

    const renderItem = ({ item }: any) => {
        const toDateString = (timestamp: any) => {
            if (timestamp?.seconds) {
                return new Date(timestamp.seconds * 1000).toLocaleDateString('ko-KR');
            }
            return '';
        };

        return (
            <View style={{ marginBottom: spacing.md }}>
                <View style={{flexDirection: 'row'}}>
                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>{item.title}</Text>
                    {/* 캠퍼스와 부서 정보 표시 */}
                    {(item.campus || item.division) && (
                        <View style={{ flexDirection: 'row', marginTop: 4, flexWrap: 'wrap' }}>
                            {item.campus && (
                                <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 6, marginTop: 4 }}>
                                    <Text style={{ color: colors.primary, fontSize: 12 }}>{item.campus}</Text>
                                </View>
                            )}
                            {item.division && (
                                <View style={{ backgroundColor: colors.success + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 6, marginTop: 4 }}>
                                    <Text style={{ color: colors.success, fontSize: 12 }}>{item.division}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
                <Text style={{ color: colors.subtext }}>{item.place}</Text>
                <Text style={{ color: colors.subtext }}>
                    {toDateString(item.startDate)} ~ {toDateString(item.endDate)}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: colors.primary, padding: spacing.sm, marginRight: spacing.sm, borderRadius: 8 }}
                        onPress={() => {
                            const start = new Date(item.startDate.seconds * 1000);
                            const end = new Date(item.endDate.seconds * 1000);
                            setForm({
                                id: item.id,
                                title: item.title,
                                place: item.place,
                                startDate: start.toISOString().split('T')[0],
                                endDate: end.toISOString().split('T')[0],
                                division: item.division,
                                campus: item.campus,
                            });
                            setTempStart(start);
                            setTempEnd(end);
                            setModalVisible(true);
                        }}
                    >
                        <Text style={{ color: '#fff', textAlign: 'center' }}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: colors.error, padding: spacing.sm, borderRadius: 8 }}
                        onPress={async () => {
                            Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
                                { text: '취소', style: 'cancel' },
                                {
                                    text: '삭제',
                                    style: 'destructive',
                                    onPress: async () => {
                                        await deleteDoc(doc(db, 'notice', item.id));
                                        fetchSchedules();
                                    },
                                },
                            ]);
                        }}
                    >
                        <Text style={{ color: '#fff', textAlign: 'center' }}>삭제</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <>
            <FlatList
                data={scheduleList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: spacing.md }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={renderItem}
            />

            <TouchableOpacity
                onPress={() => {
                    setForm({ title: '', place: '', startDate: '', endDate: '', id: '',division: '', campus: '' });
                    setTempStart(null);
                    setTempEnd(null);
                    setModalVisible(true);
                }}
                style={{ margin: spacing.md, backgroundColor: colors.primary, padding: spacing.md, borderRadius: 8 }}
            >
                <Text style={{ color: '#fff', textAlign: 'center' }}>일정 추가</Text>
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="fade">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000066' }}
                >
                    <View style={{ width: '90%', backgroundColor: colors.surface, padding: spacing.md, borderRadius: 12 }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <TextInput
                                placeholder="제목"
                                placeholderTextColor={colors.subtext}
                                value={form.title}
                                onChangeText={(t) => setForm((prev) => ({ ...prev, title: t }))}
                                style={{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 8, marginBottom: spacing.sm, padding: spacing.sm }}
                            />
                            <TextInput
                                placeholder="장소"
                                placeholderTextColor={colors.subtext}
                                value={form.place}
                                onChangeText={(t) => setForm((prev) => ({ ...prev, place: t }))}
                                style={{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 8, marginBottom: spacing.sm, padding: spacing.sm }}
                            />

                            {/* 캠퍼스 선택 */}
                            <View style={{ marginBottom: spacing.sm }}>
                                <Text style={{ marginBottom: 5, fontWeight: '500', color: colors.text }}>캠퍼스</Text>
                                <TouchableOpacity
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: 8,
                                        padding: spacing.sm,
                                        marginBottom: spacing.sm,
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onPress={() => {
                                        Alert.alert(
                                            '캠퍼스 선택',
                                            '캠퍼스를 선택해주세요',
                                            [
                                                ...campuses.map(campus => ({
                                                    text: campus,
                                                    onPress: () => setForm(prev => ({ ...prev, campus }))
                                                })),
                                                { text: '취소', style: 'cancel' }
                                            ]
                                        );
                                    }}
                                >
                                    <Text style={{ color: form.campus ? colors.text : colors.subtext }}>
                                        {form.campus || '캠퍼스 선택'}
                                    </Text>
                                    <Text style={{ color: colors.subtext }}>▼</Text>
                                </TouchableOpacity>
                            </View>

                            {/* 부서 선택 */}
                            <View style={{ marginBottom: spacing.sm }}>
                                <Text style={{ marginBottom: 5, fontWeight: '500', color: colors.text }}>부서</Text>
                                <TouchableOpacity
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: 8,
                                        padding: spacing.sm,
                                        marginBottom: spacing.sm,
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onPress={() => {
                                        Alert.alert(
                                            '부서 선택',
                                            '부서를 선택해주세요',
                                            [
                                                ...divisions.map(division => ({
                                                    text: division,
                                                    onPress: () => setForm(prev => ({ ...prev, division }))
                                                })),
                                                { text: '취소', style: 'cancel' }
                                            ]
                                        );
                                    }}
                                >
                                    <Text style={{ color: form.division ? colors.text : colors.subtext }}>
                                        {form.division || '부서 선택'}
                                    </Text>
                                    <Text style={{ color: colors.subtext }}>▼</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    setTimeout(() => setDatePickerVisible(true), 200);
                                }}
                                style={{ backgroundColor: colors.border, padding: spacing.sm, borderRadius: 8, marginBottom: spacing.sm }}
                            >
                                <Text style={{ textAlign: 'center', color: colors.text }}>날짜 선택</Text>
                            </TouchableOpacity>
                            {form.startDate && form.endDate && (
                                <Text style={{ textAlign: 'center', marginBottom: spacing.sm, color: colors.text }}>
                                    {form.startDate} ~ {form.endDate}
                                </Text>
                            )}
                            <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
                                <TouchableOpacity
                                    onPress={() => setModalVisible(false)}
                                    style={{ flex: 1, padding: spacing.sm, backgroundColor: colors.border, marginRight: spacing.sm, borderRadius: 8 }}
                                >
                                    <Text style={{ textAlign: 'center', color: colors.text }}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSave}
                                    style={{ flex: 1, padding: spacing.sm, backgroundColor: colors.primary, borderRadius: 8 }}
                                >
                                    <Text style={{ textAlign: 'center', color: '#fff' }}>저장</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={isDatePickerVisible} transparent animationType="slide">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ width: '90%', borderRadius: 12, backgroundColor: colors.surface, padding: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colors.text }}>날짜 선택</Text>
                        <Calendar
                            markingType="period"
                            markedDates={tempStart && tempEnd ? getMarkedRange(tempStart, tempEnd) : {}}
                            current={tempStart?.toISOString().split('T')[0]}
                            onDayPress={(day) => {
                                const selected = new Date(day.dateString);
                                if (isSelectingStart) {
                                    setTempStart(selected);
                                    setTempEnd(selected);
                                    setIsSelectingStart(false);
                                } else {
                                    if (tempStart && selected < tempStart) {
                                        Alert.alert('오류', '종료일은 시작일 이후여야 합니다.');
                                    } else {
                                        setTempEnd(selected);
                                        setIsSelectingStart(true);
                                    }
                                }
                            }}
                            theme={{
                                backgroundColor: colors.surface,
                                calendarBackground: colors.surface,
                                textSectionTitleColor: colors.subtext,
                                selectedDayTextColor: '#fff',
                                dayTextColor: colors.text,
                                monthTextColor: colors.text,
                                arrowColor: colors.primary,
                                textDisabledColor: '#ccc',
                                todayTextColor: colors.primary,
                            }}
                        />
                        <View style={{ flexDirection: 'row', marginTop: 20 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsSelectingStart(true);
                                    setDatePickerVisible(false);
                                    setTempStart(null);
                                    setTempEnd(null);
                                    setModalVisible(true);
                                }}
                                style={{ flex: 1, backgroundColor: colors.border, padding: spacing.sm, marginRight: 8, borderRadius: 8, alignItems: 'center' }}
                            >
                                <Text style={{ color: colors.text }}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    if (tempStart && tempEnd && tempEnd >= tempStart) {
                                        setForm((prev) => ({
                                            ...prev,
                                            startDate: tempStart.toISOString().split('T')[0],
                                            endDate: tempEnd.toISOString().split('T')[0],
                                        }));
                                        setDatePickerVisible(false);
                                        setIsSelectingStart(true);
                                        setTempStart(null);
                                        setTempEnd(null);
                                        setModalVisible(true);
                                    } else {
                                        Alert.alert('날짜 오류', '시작일과 종료일을 올바르게 선택해주세요.');
                                    }
                                }}
                                style={{ flex: 1, backgroundColor: colors.primary, padding: spacing.sm, borderRadius: 8, alignItems: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>저장</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}
