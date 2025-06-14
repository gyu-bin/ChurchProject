import { useDesign } from '@/app/context/DesignSystem';
import { useAppTheme } from '@/app/context/ThemeContext';
import BannerCarousel from '@/app/home/homeBanner';
import HomeNotices from "@/app/home/noticePage";
import QuickCalendar from '../home/QuickMenuButton/calendar'
import catechismData from '@/assets/catechism/catechism.json';
import { verses } from '@/assets/verses';
import { db } from '@/firebase/config';
import { useAppDispatch } from '@/hooks/useRedux';
import { setScrollCallback } from '@/utils/scrollRefManager';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    collection,
    getDocs,
    onSnapshot,
    query, where
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE_MARGIN = 16;
const ITEM_WIDTH = SCREEN_WIDTH - SIDE_MARGIN * 2;

type Prayer = {
    id: string;
    title: string;
    content: string;
    name: string;
    visibility: 'all' | 'pastor';
    createdAt?: {
        toDate: () => Date;
    };
};

// 일정(이벤트) 타입 명시
interface EventNotice {
    id: string;
    title: string;
    content?: string;
    place?: string;
    time?: string;
    startDate?: { seconds: number };
    endDate?: { seconds: number };
    bannerImage?: string;
    banner?: string;
    type: 'banner';
}

export default function HomeScreen() {
    const router = useRouter();
    const { mode } = useAppTheme();
    const theme = useDesign();
    const insets = useSafeAreaInsets();
    const [verse, setVerse] = useState(verses[0]);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState<'all' | 'pastor'>('all');
    const [prayers, setPrayers] = useState<any[]>([]);
    const [publicPrayers, setPublicPrayers] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(1); // 첫 번째 실 데이터 인덱스
    const [initialIndex, setInitialIndex] = useState<number | null>(null);
    const [listKey, setListKey] = useState(Date.now());
    const dispatch = useAppDispatch();

    const [videoData, setVideoData] = useState<any[]>([]);

    const mainListRef = useRef<FlatList>(null);
    const [quickModal, setQuickModal] = useState<null | 'verse' | 'calendar' | 'catechism' | 'ai'>(null);

    // 일정(이벤트) 데이터 상태 추가
    const [banners, setBanners] = useState<EventNotice[]>([]);
    // 달력 마킹용
    const [markedDates, setMarkedDates] = useState<any>({});
    // 일정 상세 모달
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedEvents, setSelectedEvents] = useState<EventNotice[]>([]);

    const [events, setEvents] = useState<EventNotice[]>([]);
    const [calendarVisible, setCalendarVisible] = useState(false);

    useEffect(() => {
        setScrollCallback('index', () => {
            mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
    }, []);

    useEffect(() => {
        if (videoData.length > 2) {
            const random = Math.floor(Math.random() * (videoData.length - 2));
            setInitialIndex(random + 1); // 앞 dummy 때문에 +1
            setCurrentIndex(random + 1);
        }

        setVerse(verses[Math.floor(Math.random() * verses.length)]);
        fetchPrayers();
    }, [videoData]); // ✅ videoData가 로딩된 후 실행되도록 의존성 추가

    useEffect(() => {
        const loadUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (raw) {
                const userData = JSON.parse(raw);
                setCurrentUser(userData);
                setUser(userData);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        const subscribe = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (!raw) return;
            const currentUser = JSON.parse(raw);
            setUser(currentUser);
            const q = query(collection(db, 'notifications'), where('to', '==', currentUser.email));
            return onSnapshot(q, snapshot => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setNotifications(list);
            });
        };

        let unsubscribe: (() => void) | undefined;

        subscribe().then((unsub) => {
            unsubscribe = unsub;
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    useEffect(() => {
        setVerse(verses[Math.floor(Math.random() * verses.length)]);
        fetchPrayers();
    }, []);

    const fetchPrayers = async () => {
        const q = query(collection(db, 'prayer_requests'), where('visibility', '==', 'all'));
        const snapshot = await getDocs(q);
        const list: Prayer[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Prayer, 'id'>),
        }));

        list.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() ?? new Date(0);
            const bDate = b.createdAt?.toDate?.() ?? new Date(0);
            return bDate.getTime() - aDate.getTime();
        });

        setPrayers(list);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setVerse(verses[Math.floor(Math.random() * verses.length)]);

        if (videoData.length > 2) {
            const random = Math.floor(Math.random() * (videoData.length - 2));
            setInitialIndex(random + 1);
            setCurrentIndex(random + 1);
            setListKey(Date.now()); // 🔁 FlatList 재생성
        }

        await fetchPrayers();
        setRefreshing(false);
    }, [videoData]); // ✅ 의존성 추가

    const goToEvent = (id: string) => {
        router.push({
          pathname: '/home/BannerDetail/event',
          params: { id },
        });
      };

    // 일정 데이터 실시간 구독
    useEffect(() => {
        const noticeQ = query(
            collection(db, 'notice'),
            where('type', '==', 'banner')
        );
        const unsub = onSnapshot(noticeQ, (snapshot) => {
            const noticeList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data()),
            })) as EventNotice[];
            setBanners(noticeList);
            // 마킹 데이터 생성
            const marks: any = {};
            noticeList.forEach(ev => {
                // startDate ~ endDate 지원
                const start = ev.startDate?.seconds ? new Date(ev.startDate.seconds * 1000) : null;
                const end = ev.endDate?.seconds ? new Date(ev.endDate.seconds * 1000) : start;
                if (start) {
                    let d = new Date(start);
                    while (d <= (end || start)) {
                        const key = d.toISOString().split('T')[0];
                        marks[key] = marks[key] || { marked: true, dots: [{ color: '#2563eb' }] };
                        d.setDate(d.getDate() + 1);
                    }
                }
            });
            setMarkedDates(marks);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const eventQ = query(
            collection(db, 'notice'),
            where('type', '==', 'event')
        );
        const unsubEvent = onSnapshot(eventQ, (snapshot) => {
            const eventList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data()),
            })) as EventNotice[];
            setEvents(eventList);

            // 마킹 처리
            const marks: any = {};
            eventList.forEach(ev => {
                const start = ev.startDate?.seconds ? new Date(ev.startDate.seconds * 1000) : null;
                const end = ev.endDate?.seconds ? new Date(ev.endDate.seconds * 1000) : start;
                if (start) {
                    let d = new Date(start);
                    while (d <= (end || start)) {
                        const key = d.toISOString().split('T')[0];
                        marks[key] = marks[key] || { marked: true, dots: [{ color: '#2563eb' }] };
                        d.setDate(d.getDate() + 1);
                    }
                }
            });
            setMarkedDates(marks);
        });
        return () => unsubEvent();
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
            <FlatList
                ref={mainListRef}
                ListHeaderComponent={(<View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                overflow: 'hidden',
                                backgroundColor: '#fff',
                                shadowColor: '#000',
                                shadowOffset: {
                                    width: 0,
                                    height: 2,
                                },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                            }}>
                                <Image
                                    source={require('@/assets/logoVer1.png')}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            </View>
                            <Text style={{
                                fontSize: 30,
                                fontWeight: '700',
                                color: '#4cc9f0',
                                marginLeft: 12,
                                letterSpacing: 1,
                                textShadowColor: 'rgba(76, 201, 240, 0.3)',
                                textShadowOffset: { width: 0, height: 2 },
                                textShadowRadius: 4,
                            }}>Xion</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/home/notifications')} style={{ position: 'relative' }}>
                            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
                            {notifications.length > 0 && (
                                <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: theme.colors.primary, borderRadius: 12, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{notifications.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* 상단배너*/}
                    {banners?.length > 0 && (
                        <BannerCarousel events={banners} goToEvent={goToEvent} theme={theme} />
                    )}

                    <View>
                        <Text>교회활동</Text>
                    </View>

                    <View>
                        <Text>교회 공지</Text>
                        <View style={{ backgroundColor: theme.colors.surface,borderRadius: theme.radius.lg, padding: theme.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 }}>
                            <HomeNotices />
                        </View>
                    </View>

                    {/* 퀵메뉴 */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 24 }}>
                        <QuickMenuButton icon="💕" label="오늘의 말씀" onPress={() => router.push('../home/QuickMenuButton/todayVerse')} />
                        <QuickMenuButton icon="📅" label="캘린더" onPress={() => setCalendarVisible(true)} />
                        <QuickMenuButton icon="📖" label="교리" onPress={() => router.push('../home/QuickMenuButton/catechism/')} />
                        <QuickMenuButton icon="🤖" label="AI로 질문" onPress={() => router.push('../home/QuickMenuButton/AiChatPage')} />
                    </View>
                </View>
                )}
                data={prayers}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={() => <View />}
            />
            {/* 오늘의 말씀 모달 */}
            <Modal visible={quickModal === 'verse'} transparent animationType="fade" onRequestClose={() => setQuickModal(null)}>
                <Pressable style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent:'center', alignItems:'center' }} onPress={() => setQuickModal(null)}>
                    <View style={{ backgroundColor:'#fff', borderRadius:20, padding:28, minWidth:260, alignItems:'center', shadowColor:'#000', shadowOpacity:0.1, shadowRadius:12 }}>
                        <Text style={{ fontSize:20, fontWeight:'bold', marginBottom:8 }}>오늘의 말씀</Text>
                        <Text style={{ fontSize:16, color:'#222', marginBottom:4 }}>{verse.verse}</Text>
                        <Text style={{ fontSize:14, color:'#888' }}>{verse.reference}</Text>
                    </View>
                </Pressable>
            </Modal>
            {/* 캘린더 모달 */}
            <QuickCalendar visible={calendarVisible} onClose={() => setCalendarVisible(false)} />
            {/*<Modal visible={quickModal === 'calendar'} transparent animationType="fade" onRequestClose={() => setQuickModal(null)}>*/}
            {/*    <Pressable*/}
            {/*        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}*/}
            {/*        onPress={() => setQuickModal(null)}*/}
            {/*    >*/}
            {/*        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, minWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12 }}>*/}
            {/*            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>*/}
            {/*                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.text }}>캘린더</Text>*/}
            {/*                <TouchableOpacity*/}
            {/*                    onPress={() => {*/}
            {/*                        const todayStr = new Date().toISOString().split('T')[0];*/}
            {/*                        setSelectedDate(todayStr);*/}
            {/*                        handleDayPress({ dateString: todayStr });*/}
            {/*                    }}*/}
            {/*                    style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: theme.colors.primary, borderRadius: 6 }}*/}
            {/*                >*/}
            {/*                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>오늘</Text>*/}
            {/*                </TouchableOpacity>*/}
            {/*            </View>*/}

            {/*            <Calendar*/}
            {/*                style={{ borderRadius: 12, width: 320 }}*/}
            {/*                theme={{*/}
            {/*                    backgroundColor: theme.colors.surface,*/}
            {/*                    calendarBackground: theme.colors.surface,*/}
            {/*                    textSectionTitleColor: theme.colors.subtext,*/}
            {/*                    selectedDayBackgroundColor: theme.colors.primary,*/}
            {/*                    selectedDayTextColor: '#fff',*/}
            {/*                    todayTextColor: theme.colors.primary,*/}
            {/*                    dayTextColor: theme.colors.text,*/}
            {/*                    textDisabledColor: '#ccc',*/}
            {/*                    arrowColor: theme.colors.primary,*/}
            {/*                    monthTextColor: theme.colors.primary,*/}
            {/*                }}*/}
            {/*                markedDates={{*/}
            {/*                    ...markedDates,*/}
            {/*                    [selectedDate]: {*/}
            {/*                        ...markedDates[selectedDate],*/}
            {/*                        selected: true,*/}
            {/*                        selectedColor: theme.colors.primary,*/}
            {/*                        selectedTextColor: '#fff',*/}
            {/*                    },*/}
            {/*                    [new Date().toISOString().split('T')[0]]: {*/}
            {/*                        ...markedDates[new Date().toISOString().split('T')[0]],*/}
            {/*                        marked: true,*/}
            {/*                        dotColor: theme.colors.primary,*/}
            {/*                    },*/}
            {/*                }}*/}
            {/*                markingType="multi-dot"*/}
            {/*                onDayPress={handleDayPress}*/}
            {/*            />*/}

            {/*             일정 상세 리스트 */}
            {/*            {selectedDate && (*/}
            {/*                <View style={{ width: 320, marginTop: 18, backgroundColor: theme.colors.card, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>*/}
            {/*                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 10 }}>{selectedDate} 일정</Text>*/}
            {/*                    {selectedEvents.length > 0 ? (*/}
            {/*                        selectedEvents.map(ev => (*/}
            {/*                            <View key={ev.id} style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 10 }}>*/}
            {/*                                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 4 }}>{ev.title}</Text>*/}
            {/*                                {ev.place && <Text style={{ color: theme.colors.subtext, marginBottom: 2 }}>장소: {ev.place}</Text>}*/}
            {/*                                {ev.time && <Text style={{ color: theme.colors.subtext, marginBottom: 2 }}>시간: {ev.time}</Text>}*/}
            {/*                                {ev.content && <Text style={{ color: theme.colors.text, marginBottom: 2 }}>{ev.content}</Text>}*/}
            {/*                                <Text style={{ color: theme.colors.subtext, fontSize: 13 }}>*/}
            {/*                                    {ev.startDate?.seconds ? new Date(ev.startDate.seconds * 1000).toLocaleDateString('ko-KR') : ''}*/}
            {/*                                    {ev.endDate?.seconds && ev.endDate?.seconds !== ev.startDate?.seconds ? ` ~ ${new Date(ev.endDate.seconds * 1000).toLocaleDateString('ko-KR')}` : ''}*/}
            {/*                                </Text>*/}
            {/*                            </View>*/}
            {/*                        ))*/}
            {/*                    ) : (*/}
            {/*                        <Text style={{ color: theme.colors.subtext, textAlign: 'center', marginVertical: 12 }}>일정이 없습니다.</Text>*/}
            {/*                    )}*/}
            {/*                </View>*/}
            {/*            )}*/}
            {/*        </View>*/}
            {/*    </Pressable>*/}
            {/*</Modal>*/}
            {/* 교리문답 모달 */}
            <Modal visible={quickModal === 'catechism'} transparent animationType="fade" onRequestClose={() => setQuickModal(null)}>
                <Pressable style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent:'center', alignItems:'center' }} onPress={() => setQuickModal(null)}>
                    <View style={{ backgroundColor:'#fff', borderRadius:20, padding:24, minWidth:280, alignItems:'center', shadowColor:'#000', shadowOpacity:0.1, shadowRadius:12 }}>
                        <Text style={{ fontSize:20, fontWeight:'bold', marginBottom:12 }}>교리문답</Text>
                        {catechismData.slice(0, 3).map((item, idx) => (
                            <View key={idx} style={{ marginBottom:10 }}>
                                <Text style={{ fontWeight:'bold', color:'#2563eb' }}>{item.question}</Text>
                                <Text style={{ color:'#222' }}>{item.answer}</Text>
                            </View>
                        ))}
                    </View>
                </Pressable>
            </Modal>
            {/* AI로 질문하기 모달 */}
            <Modal visible={quickModal === 'ai'} transparent animationType="fade" onRequestClose={() => setQuickModal(null)}>
                <Pressable style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent:'center', alignItems:'center' }} onPress={() => setQuickModal(null)}>
                    <View style={{ backgroundColor:'#fff', borderRadius:20, padding:24, minWidth:280, alignItems:'center', shadowColor:'#000', shadowOpacity:0.1, shadowRadius:12 }}>
                        <Text style={{ fontSize:20, fontWeight:'bold', marginBottom:12 }}>AI로 질문하기</Text>
                        <Text style={{ color:'#888', marginBottom:8 }}>아래에 질문을 입력해보세요!</Text>
                        <View style={{ flexDirection:'row', alignItems:'center', marginTop:8 }}>
                            <TextInput placeholder="질문을 입력하세요" style={{ borderWidth:1, borderColor:'#eee', borderRadius:8, padding:8, minWidth:160, marginRight:8 }} />
                            <TouchableOpacity style={{ backgroundColor:'#2563eb', borderRadius:8, padding:8 }}>
                                <Text style={{ color:'#fff', fontWeight:'bold' }}>전송</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>

        </SafeAreaView>
    );
}

// 퀵 메뉴 버튼 컴포넌트
function QuickMenuButton({ icon, label, onPress }: { icon: React.ReactNode | string, label: string, onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', width: 72 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#f5f6fa', justifyContent: 'center', alignItems: 'center', marginBottom: 6, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                {typeof icon === 'string' ? (
                    <Text style={{ fontSize: 30 }}>{icon}</Text>
                ) : icon}
            </View>
            <Text style={{ color: '#2d3748', fontSize: 15, fontWeight: '500' }}>{label}</Text>
        </TouchableOpacity>
    );
}
