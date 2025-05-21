// ✅ 공지사항/일정 관리 페이지 (모달 등록 + 다크모드 + 리프레시 + 입력 시 유동 화면 대응)
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Modal, TextInput,
    Platform, Alert, KeyboardAvoidingView, ScrollView, Dimensions,
    SafeAreaView, RefreshControl, useColorScheme
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, getDocs, updateDoc, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Calendar } from 'react-native-calendars';
const initialLayout = { width: Dimensions.get('window').width };

type Notice = {
    id: string;
    type: 'notice' | 'event';
    title: string;
    content: string;
    date: any;
    time?: string;
    place?: string;
};

export default function NoticeManager() {
    const { colors, spacing, font, radius } = useDesign();
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'notice', title: '공지사항' },
        { key: 'event', title: '일정' },
    ]);
    const isDark = useColorScheme() === 'dark';
    const [noticeList, setNoticeList] = useState<any[]>([]);
    const [eventList, setEventList] = useState<any[]>([]);
    const [editItem, setEditItem] = useState<any | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [eventModalVisible, setEventModalVisible] = useState(false);
    const [newItem, setNewItem] = useState<any>({ type: 'notice', title: '', content: '', place: '', date: new Date(), time: '' });

    const [eventData, setEventData] = useState({
        title: '',
        content: '',
        place: '',
        startDate: new Date(),
        endDate: new Date(),
        time: '',
        id: '', // ✅ 수정 시 사용
    });
    const [eventMode, setEventMode] = useState<'add' | 'edit'>('add');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showDateRangePicker, setShowDateRangePicker] = useState(false);
    const [isSelectingStart, setIsSelectingStart] = useState(true); // ✅ 처음엔 시작일 선택 중
    const [dateError, setDateError] = useState('');

    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [scheduleDate, setScheduleDate] = useState<string>('');

    const [tempStart, setTempStart] = useState<Date | null>(null);
    const [tempEnd, setTempEnd] = useState<Date | null>(null);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // handler
    const handleDateConfirm = (date: Date) => {
        setEventData((prev) =>
            isSelectingStart
                ? { ...prev, startDate: date, endDate: date }
                : { ...prev, endDate: date }
        );
        if (isSelectingStart) {
            setIsSelectingStart(false); // 다음엔 종료일
        } else {
            setShowDateRangePicker(false);
        }
    };

    const getMarkedRange = (start: Date, end: Date) => {
        const marked: any = {};

        const current = new Date(start);
        while (current <= end) {
            const dateStr = formatDate(current);
            marked[dateStr] = {
                color: '#1976D2',
                textColor: '#000',
                startingDay: dateStr === formatDate(start),
                endingDay: dateStr === formatDate(end),
            };
            current.setDate(current.getDate() + 1);
        }

        return marked;
    };

    const fetchData = async () => {
        const snap = await getDocs(collection(db, 'notice'));
        const all: Notice[] = snap.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Notice, 'id'>)
        }));
        setNoticeList(all.filter(n => n.type === 'notice'));
        setEventList(all.filter(n => n.type === 'event'));
    };

    useEffect(() => { fetchData(); }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    const openEditModal = (item: any) => {
        setEditItem(item);
        setEditModalVisible(true);
    };

    const handleSave = async () => {
        if (!editItem.title.trim()) return Alert.alert('제목은 필수입니다');
        await updateDoc(doc(db, 'notice', editItem.id), editItem);
        setEditModalVisible(false);
        fetchData();
    };

    const handleDelete = async (id: string) => {
        Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제', style: 'destructive', onPress: async () => {
                    await deleteDoc(doc(db, 'notice', id));
                    fetchData();
                }
            }
        ])
    };

    const handleAdd = async () => {
        if (!newItem.title.trim() || !newItem.content.trim()) return Alert.alert('필수 항목을 입력해주세요');
        await addDoc(collection(db, 'notice'), newItem);
        setAddModalVisible(false);
        setNewItem({ type: 'notice', title: '', content: '', place: '', date: new Date(), time: '' });
        fetchData();
    };

    const handleSubmitEvent = async () => {
        if (!eventData.title.trim()) {
            return Alert.alert('필수 항목을 입력해주세요.');
        }

        const payload = {
            title: eventData.title,
            content: eventData.content,
            place: eventData.place,
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            time: eventData.time,
            type: 'event',
        };

        try {
            if (eventMode === 'edit' && eventData.id) {
                await updateDoc(doc(db, 'notice', eventData.id), payload);
            } else {
                await addDoc(collection(db, 'notice'), payload);
            }

            setEventModalVisible(false);
            setEventData({
                id: '',
                title: '',
                content: '',
                place: '',
                startDate: new Date(),
                endDate: new Date(),
                time: '',
            });
            fetchData();
        } catch (err) {
            console.error('❌ 저장 오류:', err);
            Alert.alert('저장 실패', '다시 시도해주세요.');
        }
    };

    const openEditEventModal = (item: any) => {
        setEventData({
            title: item.title,
            content: item.content,
            place: item.place,
            startDate: item.startDate?.seconds
                ? new Date(item.startDate.seconds * 1000)
                : new Date(),
            endDate: item.endDate?.seconds
                ? new Date(item.endDate.seconds * 1000)
                : new Date(),
            time: item.time || '',
            id: item.id, // 수정 시 사용할 doc ID
        });
        setEventMode('edit');
        setEventModalVisible(true);
    };

    const renderItem = (item: any) => (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm }}>
            <Text style={{ fontSize: font.body, fontWeight: 'bold', color: colors.text }}>{item.title}</Text>
            {/*<Text style={{ fontSize: font.body, color: colors.subtext }}>{item.content}</Text>*/}
            {item.place && <Text style={{ fontSize: font.caption, color: colors.subtext }}>📍 {item.place}</Text>}
            {item.startDate?.seconds && item.endDate?.seconds && (
                <Text style={{ fontSize: font.caption, color: colors.subtext }}>
                    📅 {new Date(item.startDate.seconds * 1000).toLocaleDateString('ko-KR')}
                    {' ~ '}
                    {new Date(item.endDate.seconds * 1000).toLocaleDateString('ko-KR')}
                    {/*{item.time && ` 🕒 ${item.time}`}*/}
                </Text>
            )}
            <View style={{ flexDirection: 'row', marginTop: spacing.sm, gap: 10 }}>
                {item.type === 'notice' && (
                    <TouchableOpacity onPress={() => openEditModal(item)} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#fff' }}>수정</Text>
                    </TouchableOpacity>
                )}
                {item.type === 'event' && (
                    <TouchableOpacity
                        onPress={() => {
                            if (item.type === 'event') openEditEventModal(item);
                            else openEditModal(item); // 기존 공지사항 수정 로직
                        }}
                        style={{
                            flex: 1,
                            backgroundColor: colors.primary,
                            borderRadius: 8,
                            padding: 10,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#fff' }}>수정</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ flex: 1, backgroundColor: colors.error, borderRadius: 8, padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#fff' }}>삭제</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderForm = (item: any, setItem: any) => (
        <ScrollView style={{ width: '100%' }} contentContainerStyle={{ padding: 20 }}>
            <TextInput placeholder="제목" value={item.title} onChangeText={t => setItem({ ...item, title: t })}
                       style={{ borderWidth: 1, borderColor: colors.border, padding: 10, color: colors.text, borderRadius: 8, marginBottom: 10 }} />
            <TextInput placeholder="내용" value={item.content} onChangeText={t => setItem({ ...item, content: t })} multiline
                       style={{ borderWidth: 1, borderColor: colors.border, padding: 10, color: colors.text, borderRadius: 8, height: 100, textAlignVertical: 'top', marginBottom: 10 }} />
            {item.type === 'event' && (
                <TextInput placeholder="장소" value={item.place} onChangeText={t => setItem({ ...item, place: t })}
                           style={{ borderWidth: 1, borderColor: colors.border, padding: 10, color: colors.text, borderRadius: 8, marginBottom: 10 }} />
            )}
        </ScrollView>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <TabView
                navigationState={{ index, routes }}
                renderScene={SceneMap({
                    notice: () => (
                        <FlatList
                            data={noticeList}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: spacing.md }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            renderItem={({ item }) => renderItem(item)}
                        />
                    ),
                    event: () => (
                        <FlatList
                            data={eventList}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: spacing.md }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            renderItem={({ item }) => renderItem(item)}
                        />
                    )
                })}
                onIndexChange={setIndex}
                initialLayout={initialLayout}
                renderTabBar={props => (
                    <TabBar
                        {...props}
                        indicatorStyle={{ backgroundColor: colors.primary }}
                        style={{ backgroundColor: colors.surface }}
                        activeColor={colors.primary}
                        inactiveColor={colors.subtext}
                    />
                )}
            />

            {/* ➕ 추가 버튼 */}
            <TouchableOpacity
                onPress={() => {
                    if (index === 0) {
                        setAddModalVisible(true);
                    } else {
                        // 👉 여기서 초기화 추가
                        setEventData({
                            id: '',
                            title: '',
                            content: '',
                            place: '',
                            startDate: new Date(),
                            endDate: new Date(),
                            time: '',
                        });
                        setEventMode('add'); // 모드도 add로 초기화
                        setEventModalVisible(true);
                    }
                }}
                style={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    backgroundColor: colors.primary,
                    borderRadius: 100,
                    padding: 16,
                }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 24 }}>＋</Text>
            </TouchableOpacity>

            {/* 수정/등록 모달 */}
            <Modal visible={editModalVisible || addModalVisible} transparent animationType="fade">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000066' }}>
                    <View style={{ width: '90%', backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
                        {renderForm(editModalVisible ? editItem : newItem, editModalVisible ? setEditItem : setNewItem)}
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity onPress={() => {
                                editModalVisible ? setEditModalVisible(false) : setAddModalVisible(false)
                            }} style={{ flex: 1, backgroundColor: colors.border, padding: 16, alignItems: 'center' }}>
                                <Text style={{ color: colors.text }}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={editModalVisible ? handleSave : handleAdd} style={{ flex: 1, backgroundColor: colors.primary, padding: 16, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>저장</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 일정 전용 모달은 기존 코드 유지 */}
            <Modal visible={eventModalVisible} transparent animationType="fade">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)', // 🔴 어두운 배경
                    }}
                >
                    <View
                        style={{
                            width: '90%',
                            maxHeight: '90%',
                            backgroundColor: colors.surface,
                            borderRadius: 16,
                            padding: spacing.md,
                        }}
                    >
                        <ScrollView
                            contentContainerStyle={{ paddingBottom: spacing.md }}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md }}>
                                🗓 일정 추가
                            </Text>

                            {/* 제목 */}
                            <TextInput
                                placeholder="제목"
                                value={eventData.title}
                                onChangeText={(text) => setEventData((prev: any) => ({ ...prev, title: text }))}
                                placeholderTextColor={colors.subtext}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    padding: spacing.sm,
                                    color: colors.text,
                                    marginBottom: spacing.sm,
                                }}
                            />

                            {/* 내용 */}
                            {/*<TextInput
                                placeholder="내용"
                                value={eventData.content}
                                onChangeText={(text) => setEventData((prev: any) => ({ ...prev, content: text }))}
                                multiline
                                placeholderTextColor={colors.subtext}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    padding: spacing.sm,
                                    height: 100,
                                    textAlignVertical: 'top',
                                    color: colors.text,
                                    marginBottom: spacing.sm,
                                }}
                            />*/}

                            {/* 장소 */}
                            <TextInput
                                placeholder="장소"
                                value={eventData.place}
                                onChangeText={(text) => setEventData(prev => ({ ...prev, place: text }))}
                                placeholderTextColor={colors.subtext}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    padding: spacing.sm,
                                    color: colors.text,
                                    marginBottom: spacing.sm,
                                }}
                            />

                            {/*날짜 선택*/}
                            <TouchableOpacity
                                onPress={() => {
                                    setTempStart(eventData.startDate);
                                    setTempEnd(eventData.endDate);
                                    setIsSelectingStart(true);
                                    setDatePickerVisible(true);
                                }}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    padding: spacing.sm,
                                    marginBottom: spacing.sm,
                                }}
                            >
                                <Text style={{ color: colors.text }}>
                                    📅 기간: {eventData.startDate.toLocaleDateString()} ~ {eventData.endDate.toLocaleDateString()}
                                </Text>
                            </TouchableOpacity>

                            <Modal visible={isDatePickerVisible} transparent animationType="slide">
                                <View style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                }}>
                                    <View style={{
                                        width: '90%',
                                        borderRadius: 12,
                                        backgroundColor: colors.surface,
                                        padding: 20,
                                    }}>
                                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colors.text }}>
                                            날짜 선택
                                        </Text>

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
                                                        setIsSelectingStart(true); // 다음 선택은 시작일
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
                                                }}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: colors.border,
                                                    padding: spacing.sm,
                                                    marginRight: 8,
                                                    borderRadius: 8,
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Text style={{ color: colors.text }}>취소</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (tempStart && tempEnd && tempEnd >= tempStart) {
                                                        setEventData(prev => ({
                                                            ...prev,
                                                            startDate: tempStart,
                                                            endDate: tempEnd,
                                                        }));
                                                        setDatePickerVisible(false);
                                                        setIsSelectingStart(true);
                                                        setTempStart(null);
                                                        setTempEnd(null);
                                                    } else {
                                                        Alert.alert('날짜 오류', '시작일과 종료일을 올바르게 선택해주세요.');
                                                    }
                                                }}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: colors.primary,
                                                    padding: spacing.sm,
                                                    borderRadius: 8,
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>저장</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </Modal>

                            {/*{showDateRangePicker && (
                                <DateTimePicker
                                    value={isSelectingStart ? eventData.startDate : eventData.endDate}
                                    mode="date"
                                    display="inline"
                                    themeVariant={isDark ? 'dark' : 'light'} // ✅ 다크모드 반영
                                    onChange={(event, selectedDate) => {
                                        if (event.type === 'set' && selectedDate) {
                                            if (isSelectingStart) {
                                                setEventData(prev => ({
                                                    ...prev,
                                                    startDate: selectedDate,
                                                    endDate: selectedDate, // 시작일 선택 시 종료일 초기화
                                                }));
                                                setIsSelectingStart(false); // 다음은 종료일 선택
                                            } else {
                                                setEventData(prev => ({
                                                    ...prev,
                                                    endDate: selectedDate,
                                                }));
                                                setShowDateRangePicker(false); // 종료일 선택 후 닫기
                                            }
                                        } else {
                                            // 사용자가 캔슬한 경우
                                            setShowDateRangePicker(false);
                                        }
                                    }}
                                />
                            )}*/}
                            {/* 시간 선택 */}
                           {/* <TouchableOpacity
                                onPress={() => setShowTimePicker(true)}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    padding: spacing.sm,
                                    marginBottom: spacing.sm,
                                }}
                            >
                                <Text style={{ color: colors.text }}>
                                    🕒 시간: {eventData.time}
                                </Text>
                            </TouchableOpacity>

                            {showTimePicker && (
                                <DateTimePicker
                                    value={new Date()}
                                    mode="time"
                                    display="spinner"
                                    onChange={(e, selectedTime) => {
                                        setShowTimePicker(false);
                                        if (selectedTime) {
                                            const time = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            setEventData(prev => ({ ...prev, time }));
                                        }
                                    }}
                                />
                            )}*/}

                            {/* 버튼 */}
                            <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
                                <TouchableOpacity
                                    onPress={() => setEventModalVisible(false)}
                                    style={{
                                        flex: 1,
                                        backgroundColor: colors.border,
                                        padding: spacing.md,
                                        alignItems: 'center',
                                        borderRadius: 8,
                                        marginRight: spacing.sm,
                                    }}
                                >
                                    <Text style={{ color: colors.text }}>취소</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSubmitEvent}
                                    style={{
                                        flex: 1,
                                        backgroundColor: colors.primary,
                                        padding: spacing.md,
                                        alignItems: 'center',
                                        borderRadius: 8,
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>저장</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
