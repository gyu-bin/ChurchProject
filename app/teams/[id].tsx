//app/teams/[id].tsx
import loading4 from '@/assets/lottie/Animation - 1747201330128.json';
import loading3 from '@/assets/lottie/Animation - 1747201413764.json';
import loading2 from '@/assets/lottie/Animation - 1747201431992.json';
import loading1 from '@/assets/lottie/Animation - 1747201461030.json';
import CustomDateModal from "@/components/dataPicker";
import LoadingModal from "@/components/lottieModal";
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db, storage } from '@/firebase/config';
import { getCurrentUser } from '@/services/authService';
import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { showToast } from "@/utils/toast"; // ✅ 추가
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    arrayRemove,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    onSnapshot,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    Image as RNImage,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { Calendar } from "react-native-calendars";
import Toast from "react-native-root-toast";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditTeamModal from "@/app/teams/modal/EditTeamModal";


type Team = {
    id: string;
    name: string;
    leader: string;
    leaderEmail: string;
    subLeaderEmail?: string; // 부모임장 이메일 추가
    members: number;
    capacity: number;
    membersList: string[];
    announcement?: string;
    scheduleDate?: string; // YYYY-MM-DD
    location?: string;
    meetingTime?: string;
    expirationDate?: any;
    thumbnail?: string;
    openCantact: any
    [key: string]: any; // 기타 필드를 허용하는 경우
};

type VoteStatus = 'yes' | 'no' | 'maybe';

type Vote = {
    userId: string;
    userName: string;
    status: VoteStatus;
    timestamp: number;
};

// Add this type for vote statistics
type VoteStats = {
    yes: number;
    no: number;
    maybe: number;
    total: number;
};

type Schedule = {
    date: string;
    createdAt: number;
    createdBy: string;
    creatorName: string;
    status: 'active' | 'cancelled';
};

export default function TeamDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [memberUsers, setMemberUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const { colors, font, spacing, radius } = useDesign();
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const [currentUser, setCurrentUser] = useState<any>(null);
    const isCreator = team?.leaderEmail === user?.email;
    const isSubLeader = team?.subLeaderEmail === user?.email;
    const isManager = isCreator || isSubLeader;
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);

    //수정
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCapacity, setEditCapacity] = useState('');
    const [isUnlimited, setIsUnlimited] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const [openContact, setOpenContact] = useState('');


    const [scheduleDate, setScheduleDate] = useState<string | null>(null);
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [isClosed, setIsClosed] = useState(false);
    const [alreadyRequested, setAlreadyRequested] = useState(false);

    const [chatBadgeCount, setChatBadgeCount] = useState(0);
    const [isVoteModalVisible, setVoteModalVisible] = useState(false);
    const [votes, setVotes] = useState<{ [key: string]: Vote }>({});
    const [myVote, setMyVote] = useState<VoteStatus | null>(null);
    const [selectedVote, setSelectedVote] = useState<VoteStatus | null>(null);
    const [showVoteStatus, setShowVoteStatus] = useState(false);
    const [isLocationModalVisible, setLocationModalVisible] = useState(false);
    const [locationInput, setLocationInput] = useState('');
    const [category, setCategory] = useState('');
    const [expirationDate, setExpirationDate] = useState(new Date());
    const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
    const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
    const [isSparkleModalVisible, setSparkleModalVisible] = useState(false);
    const [imageURLs, setImageURLs] = useState<ImagePickerAsset[]>([]);
    const [showCalendar, setShowCalendar] = useState(false);
    const [loadingAnimation, setLoadingAnimation] = useState<any>(null);
    const loadingAnimations = [loading1, loading2, loading3, loading4];

    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const random = Math.floor(Math.random() * loadingAnimations.length);
        setLoadingAnimation(loadingAnimations[random]);
    }, []);
    const [updateLoading, setUpdateLoading] = useState(false); // 🔸 수정 중 로딩용
    const [imageAspectRatio, setImageAspectRatio] = useState<number | undefined>();

    const [commonLocations] = useState([
        '본당',
        '카페',
    ]);
    const categories = [
        { label: '✨ 반짝소모임', value: '반짝소모임' },
        { label: '🏃 운동/스포츠', value: '운동/스포츠' },
        { label: '📚 책모임', value: '책모임' },
        { label: '🎮 게임', value: '게임' },
        { label: '🎭 문화생활', value: '문화생활' },
        { label: '🤝 봉사', value: '봉사' },
        { label: '📖 스터디', value: '스터디' },
        { label: '🐾 동물', value: '동물' },
        { label: '🍳 요리/제조', value: '요리/제조' },
    ];

    const [editCategory, setEditCategory] = useState(team?.category || '');

    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    useEffect(() => {
        if (team) {
            setEditCategory(team.category || '');
        }
        getCurrentUser().then(setCurrentUser);
        const unsubscribe = fetchTeam();
        return () => unsubscribe && unsubscribe();
    }, [team]);


    useEffect(() => {
        if (team?.thumbnail) {
            RNImage.getSize(
                team.thumbnail,
                (width: number, height: number) => {
                    setImageAspectRatio(width / height);
                },
                () => {
                    console.warn('이미지 사이즈 가져오기 실패');
                    setImageAspectRatio(1.5/2); // fallback 비율
                }
            );
        }
    }, [team?.thumbnail]);

    /*    useEffect(() => {
            getCurrentUser().then(setCurrentUser);
        }, []);


        useEffect(() => {
            const unsubscribe = fetchTeam();
            return () => unsubscribe && unsubscribe();
        }, []);*/

    useEffect(() => {
        const checkJoinRequest = async () => {
            if (!user || !team) return;

            const q = query(
                collection(db, 'notifications'),
                where('type', '==', 'team_join_request'),
                where('teamId', '==', team.id),
                where('applicantEmail', '==', user.email),
            );

            const snap = await getDocs(q);
            if (!snap.empty) {
                setAlreadyRequested(true); // 이미 신청한 상태로 처리
            }
        };

        checkJoinRequest();
    }, [user, team]);

    useEffect(() => {
        if (!id) return;

        const teamRef = doc(db, 'teams', id);
        const unsubscribe = onSnapshot(teamRef, (docSnap) => {
            if (!docSnap.exists()) return;

            const teamData = docSnap.data();
            if (teamData.scheduleDate) {
                setScheduleDate(teamData.scheduleDate);
            }
            if (teamData.announcement !== undefined) {
                setAnnouncement(teamData.announcement);
            }
        });

        return () => unsubscribe();
    }, [id]);

// 🔄 API 호출 로직 분리
    const fetchTeam = () => {
        // console.log('팀 정보 가져오기 시작');
        const teamRef = doc(db, 'teams', id);

        const unsubscribe = onSnapshot(teamRef, async (docSnap) => {
            if (!docSnap.exists()) return;

            const teamData = { id: docSnap.id, ...docSnap.data() } as Team;
            setTeam(teamData);

            // isClosed 상태 업데이트
            setIsClosed(teamData.isClosed === true);

            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);

                const emails = Array.from(new Set(teamData.membersList || []));
                if (emails.length > 0) {
                    const batches = [];
                    const cloned = [...emails];
                    while (cloned.length) {
                        const batch = cloned.splice(0, 10);
                        batches.push(query(collection(db, 'users'), where('email', 'in', batch)));
                    }
                    const results = await Promise.all(batches.map(q => getDocs(q)));
                    const users = results.flatMap(snap => snap.docs.map(doc => doc.data()));
                    setMemberUsers(users);
                }
            } catch (e) {
                console.error('❌ 사용자/멤버 정보 로딩 실패:', e);
            } finally {
                setLoading(false);     // ✅ 로딩 완료 처리
                setRefreshing(false);  // ✅ 리프레시 완료 처리
            }
        });

        return unsubscribe;
    };
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        unsubscribe = fetchTeam();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!team?.id || !scheduleDate || !user) return;

        const votesRef = collection(db, 'teams', team.id, 'scheduleVotes');
        const q = query(votesRef, where('scheduleDate', '==', scheduleDate));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const votesData: { [key: string]: Vote } = {};
            snapshot.docs.forEach((doc) => {
                votesData[doc.id] = doc.data() as Vote;

                // ✅ 해당 부분이 핵심: 현재 사용자의 투표 상태를 반영
                if (doc.id === user?.email) {
                    setMyVote(doc.data().status as VoteStatus);
                }
            });
            setVotes(votesData);
        });

        return () => unsubscribe();
    }, [team?.id, scheduleDate, user]);  // ✅ user를 의존성에 추가

    // 모임가입
    const handleJoin = async () => {
        if (!team || !user) return;

        if (team.membersList?.includes(user.email)) {
            Alert.alert('참여 불가', '이미 가입된 모임입니다.');
            return;
        }

        const isUnlimited = team.maxMembers === -1;

        if (!isUnlimited && (team.membersList?.length ?? 0) >= (team.maxMembers ?? 99)) {
            Alert.alert('인원 초과', '모집이 마감되었습니다.');
            return;
        }

        // ✅ 1. Push 토큰 가져오기 (email 기준으로)
        const q = query(collection(db, 'expoTokens'), where('email', '==', team.leaderEmail));
        const snap = await getDocs(q);
        const tokens: string[] = snap.docs.map(doc => doc.data().token).filter(Boolean);

// ✅ 2. Firestore 알림 저장 (email 저장)
        await sendNotification({
            to: team.leaderEmail, // Firestore 알림 받는 주체(email)
            message: `${user.name}님이 "${team.name}" 모임에 가입 신청했습니다.`,
            type: 'team_join_request',
            link: '/notifications',
            teamId: team.id,
            teamName: team.name,
            applicantEmail: user.email,
            applicantName: user.name,
        });

// ✅ 3. Expo 푸시 전송 (token 기반)
        if (tokens.length > 0) {
            await sendPushNotification({
                to: tokens,
                title: '🙋 소모임 가입 신청',
                body: `${user.name}님이 "${team.name}" 모임에 가입 신청했습니다.`,
            });
        }

        showToast('✅가입 신청 완료: 모임장에게 신청 메시지를 보냈습니다.');
        fetchTeam();  // ✅ 추가된 부분
        // router.back();
    };

    const openEditModal = () => {
        if (!team) return;
        setEditName(team.name);
        setEditDescription(team.description || '');
        setAnnouncement(team.announcement || '');
        setOpenContact(team.openContact || '');
        if (team.maxMembers === null || team.maxMembers === undefined || team.maxMembers === -1) {
            setIsUnlimited(true);
            setEditCapacity('');
        } else {
            setIsUnlimited(false);
            setEditCapacity(String(team.maxMembers));
        }
        setCategory(team.category || '');

        if (team.expirationDate) {
            const parsedDate =
                team.expirationDate instanceof Date
                    ? team.expirationDate
                    : team.expirationDate.toDate?.() || new Date(team.expirationDate);
            setExpirationDate(parsedDate);
        }

        if (team.thumbnail) {
            const uri = team.thumbnail;
            setImageURLs([{ uri } as ImagePickerAsset]); // 타입 단언으로 오류 제거
            setSelectedThumbnail(uri);
        } else {
            setImageURLs([]);
            setSelectedThumbnail(null);
        }
        setEditModalVisible(true);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('권한 필요', '이미지 라이브러리에 접근 권한이 필요합니다.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
            base64: false,
        });

        if (!result.canceled && result.assets.length > 0) {
            const selected = result.assets[0];
            setImageURLs([selected]); // ✅ 하나만 선택
            // setForm(prev => ({ ...prev, bannerImage: selected.uri })); // ✅ 미리보기용 uri 저장
        }
    };

    const deleteImageFromFirebase = async (imageUrl: string) => {
      try {
        const decodedUrl = decodeURIComponent(imageUrl.split('?')[0]);
        const pathStart = decodedUrl.indexOf('/o/') + 3;
        const pathEnd = decodedUrl.length;
        const fullPath = decodedUrl.substring(pathStart, pathEnd).replace(/%2F/g, '/');
        const imageRef = ref(storage, fullPath);
        await deleteObject(imageRef);
        console.log('Existing image deleted successfully');
      } catch (error) {
        console.error('Failed to delete existing image:', error);
      }
    };

    const uploadImageToFirebase = async (imageUri: string, oldUrl?: string): Promise<string> => {
        try {
            // ✅ 기존 이미지 삭제는 oldUrl이 있을 때만 실행
            if (oldUrl && imageUri !== oldUrl) {
                console.log('🗑 기존 이미지 삭제 시도');
                await deleteImageFromFirebase(oldUrl);
            }

            // ✅ 새 이미지 업로드
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const filename = `uploads/${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            console.log('✅ 새 이미지 업로드 완료:', downloadURL);
            return downloadURL;
        } catch (error) {
            console.error('❌ 이미지 업로드 실패:', error);
            throw error;
        }
    };

    // ✅ 수정 함수
    const handleUpdateTeam = async () => {
        if (!team) return;

        setUpdateLoading(true); // ✅ 로딩 모달 켜기

        const currentCount = team.membersList?.length ?? 0;
        let newMax: number | null = null;

        if (!isUnlimited) {
            newMax = Number(editCapacity);
            if (isNaN(newMax) || newMax < currentCount) {
                Alert.alert('유효하지 않은 최대 인원', `현재 모임 인원(${currentCount}명)보다 작을 수 없습니다.`);
                setUpdateLoading(false); // ✅ 여기서도 로딩 꺼줌
                return;
            }
        } else {
            newMax = -1;
        }

        try {
            console.log('모임 수정 시작. isClosed 상태:', isClosed);

            let newThumbnailUrl = team.thumbnail;
            if (imageURLs.length > 0 && imageURLs[0]?.uri && imageURLs[0].uri !== team.thumbnail) {
                newThumbnailUrl = await uploadImageToFirebase(imageURLs[0].uri, team.thumbnail);
            }

            const updateData: any = {
                name: editName,
                description: editDescription,
                maxMembers: newMax,
                announcement,
                scheduleDate,
                openContact,
                category,
                isClosed,
                thumbnail: newThumbnailUrl
            };

            if (category === '✨ 반짝소모임') {
                updateData.expirationDate = new Date(expirationDate);
            }

            const teamRef = doc(db, 'teams', team.id);
            await updateDoc(teamRef, updateData);

            setTeam(prev => prev && {
                ...prev,
                ...updateData
            });

            Toast.show('✅ 수정 완료', { duration: 1500 });
            await fetchTeam();

            // ✨ 푸시 알림 보내기
            if (editCategory === '✨ 반짝소모임') {
                const snapshot = await getDocs(collection(db, 'users'));
                const sentTokens = new Set<string>();
                const pushPromises: Promise<void>[] = [];

                snapshot.docs.forEach((docSnap) => {
                    const user = docSnap.data();
                    const tokens: string[] = user.expoPushTokens || [];

                    tokens.forEach(token => {
                        if (
                            typeof token === 'string' &&
                            token.startsWith('ExponentPushToken') &&
                            !sentTokens.has(token)
                        ) {
                            sentTokens.add(token);
                            pushPromises.push(
                                sendPushNotification({
                                    to: token,
                                    title: '✨ 반짝소모임 업데이트!',
                                    body: `반짝소모임 ${editName}에 지금 참여해보세요!`,
                                })
                            );
                        }
                    });
                });

                await Promise.all(pushPromises);
                console.log(`✅ ✨ 반짝소모임 수정 푸시 완료: ${sentTokens.size}명`);
            }

            // ✅ 성공 시에만 모달 닫기
            setEditModalVisible(false);

        } catch (e) {
            console.error('❌ 모임 정보 수정 실패:', e);
            Alert.alert('에러', '모임 수정 중 문제가 발생했습니다.');
        } finally {
            setUpdateLoading(false); // ✅ 로딩 모달 끄기
        }
    };

    const handleKick = async (email: string) => {
        if (!team) return;

        // ✅ 이메일에 해당하는 사용자 이름 찾기
        const member = memberUsers.find(m => m.email === email);
        const displayName = member?.name || email;

        Alert.alert('정말 강퇴하시겠습니까?', displayName, [
            { text: '취소', style: 'cancel' },
            {
                text: '강퇴', style: 'destructive', onPress: async () => {
                    try {
                        const teamRef = doc(db, 'teams', team.id);
                        await updateDoc(teamRef, {
                            membersList: arrayRemove(email),
                            members: increment(-1),
                        });

                        const updatedSnap = await getDoc(teamRef);
                        if (updatedSnap.exists()) {
                            const updatedData = updatedSnap.data();
                            setTeam({
                                id: updatedSnap.id,
                                name: updatedData.name,
                                leader: updatedData.leader,
                                leaderEmail: updatedData.leaderEmail,
                                members: updatedData.members,
                                capacity: updatedData.capacity,
                                membersList: updatedData.membersList,
                                openCantact: updatedData.openContact,
                                ...updatedData, // 기타 필드
                            });
                        }

                        setMemberUsers(prev => prev.filter(m => m.email !== email));
                        fetchTeam();  // ✅ 추가된 부분
                        Alert.alert('강퇴 완료', `${displayName}님이 강퇴되었습니다.`);
                    } catch (e) {
                        console.error('❌ 강퇴 실패:', e);
                        Alert.alert('에러', '강퇴에 실패했습니다.');
                    }
                }
            }
        ]);
    };

    const deleteTeam = async (id: string) => {
        Alert.alert('삭제 확인', '정말로 이 소모임을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'teams', id));
                        setTeam(null); // ❗단일 객체니까 이렇게 처리
                        showToast('✅삭제 완료: 소모임이 삭제되었습니다.');
                        router.replace('/teams'); // 삭제 후 소모임 목록으로 이동
                    } catch (e) {
                        Alert.alert('오류', '삭제에 실패했습니다.');
                        console.error(e);
                    }
                },
            },
        ]);
    };

    const handleDateConfirm = async (date: Date) => {
        if (!team || !user) return;

        const newDate = date.toISOString().slice(0, 10); // YYYY-MM-DD

        // 동일한 날짜면 업데이트/알림 스킵
        if (team.scheduleDate === newDate) {
            setDatePickerVisible(false);
            return;
        }

        handleScheduleUpdate(newDate);
        setDatePickerVisible(false);
    };

    const handleScheduleUpdate = async (newDate: string) => {
        if (!team || !user) return;

        try {
            // 1. 팀 문서 업데이트
            const teamRef = doc(db, 'teams', team.id);
            await updateDoc(teamRef, {
                scheduleDate: newDate,
                lastScheduleUpdate: Date.now(),
            });

            // 2. 스케줄 컬렉션에 새로운 일정 추가
            const scheduleRef = doc(collection(db, 'teams', team.id, 'schedules'));
            const scheduleData: Schedule = {
                date: newDate,
                createdAt: Date.now(),
                createdBy: user.email,
                creatorName: user.name,
                status: 'active',
            };
            await setDoc(scheduleRef, scheduleData);

            setScheduleDate(newDate);

            // 3. 기존 투표 데이터 초기화
            const votesRef = collection(db, 'teams', team.id, 'scheduleVotes');
            const votesSnapshot = await getDocs(votesRef);
            const batch = writeBatch(db);
            votesSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // 4. 모임원들에게 알림 전송
            if (!team.membersList) return;

            const emails = team.membersList.filter(email => email !== team.leaderEmail);
            if (emails.length > 0) {
                const tokenQueryBatches = [];
                const emailClone = [...emails];

                while (emailClone.length) {
                    const batch = emailClone.splice(0, 10);
                    tokenQueryBatches.push(
                        query(collection(db, 'expoTokens'), where('email', 'in', batch))
                    );
                }

                const tokenSnapshots = await Promise.all(tokenQueryBatches.map(q => getDocs(q)));
                const tokens = tokenSnapshots.flatMap(snap =>
                    snap.docs.map(doc => doc.data().token).filter(Boolean)
                );

                if (tokens.length > 0) {
                    await sendPushNotification({
                        to: tokens,
                        title: `📅 ${team.name} 모임 일정 안내`,
                        body: `모임 일정이 ${newDate}로 정해졌어요! 참석 여부를 투표해주세요.`,
                    });
                }

                const notificationPromises = emails.map(email =>
                    sendNotification({
                        to: email,
                        message: `${team.name} 모임의 일정이 ${newDate}로 정해졌습니다.`,
                        type: 'schedule_update',
                        link: `/teams/${team.id}`,
                        teamId: team.id,
                        teamName: team.name,
                        scheduleDate: newDate,
                    })
                );
                await Promise.all(notificationPromises);
            }

            showToast('✅ 일정이 저장되었습니다.');
        } catch (e) {
            console.error('❌ 일정 저장 실패:', e);
            showToast('⚠️ 일정 저장에 실패했습니다.');
        }
    };

    const handleShare = async () => {
        try {
            // 딥링크 URL 생성 (expo-router의 경우)
            const shareUrl = `churchapp://teams/${id}`;
            const shareMessage = `${team?.name} 모임에 참여해보세요!\n\n${shareUrl}`;

            const result = await Share.share({
                message: shareMessage,
                url: shareUrl,  // iOS only
            });

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    showToast('링크가 공유되었습니다');
                } else {
                    showToast('링크가 공유되었습니다');
                }
            }
        } catch (error) {
            // 공유 실패 시 클립보드에 복사
            const shareUrl = `churchapp://teams/${id}`;
            await Clipboard.setStringAsync(shareUrl);
            showToast('링크가 클립보드에 복사되었습니다');
        }
    };

    const handleVote = async (status: VoteStatus) => {
        if (!team?.id || !scheduleDate || !user) return;

        const voteRef = doc(db, 'teams', team.id, 'scheduleVotes', user.email);

        // 같은 걸 눌렀다면 → 삭제
        if (myVote === status) {
            try {
                await deleteDoc(voteRef);
                setMyVote(null);
                setSelectedVote(null);
                setShowVoteStatus(false);
                showToast('⛔️ 투표가 취소되었습니다.');
            } catch (e) {
                console.error('❌ 투표 취소 실패:', e);
                showToast('⚠️ 투표 취소 중 문제가 발생했습니다.');
            }
            return;
        }

        try {
            await setDoc(voteRef, {
                userId: user.email,
                userName: user.name,
                status,
                scheduleDate,
                timestamp: Date.now(),
            });

            setMyVote(status);
            setSelectedVote(null);
            setShowVoteStatus(true);
            showToast('✅ 투표가 완료되었습니다.');
        } catch (error) {
            console.error('투표 저장 실패:', error);
            showToast('⚠️ 투표 저장에 실패했습니다.');
        }
    };

    // Add function to calculate vote statistics
    const calculateVoteStats = (): VoteStats => {
        const voteArray = Object.values(votes);
        const total = voteArray.length;
        return {
            yes: voteArray.filter(v => v.status === 'yes').length,
            no: voteArray.filter(v => v.status === 'no').length,
            maybe: voteArray.filter(v => v.status === 'maybe').length,
            total
        };
    };

/*    const VoteStatusBar = ({ status, count, total, color }: { status: string; count: number; total: number; color: string }) => (
        <View style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: font.caption, color: colors.text }}>{status}</Text>
                <Text style={{ fontSize: font.caption, color: colors.text }}>{count}명</Text>
            </View>
            <View style={{
                height: 8,
                backgroundColor: colors.border,
                borderRadius: 4,
                overflow: 'hidden',
            }}>
                <View style={{
                    width: `${(count / (total || 1)) * 100}%`,
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: 4,
                }} />
            </View>
        </View>
    );*/

    const handleUpdateLocation = async (location: string) => {
        if (!team) return;

        try {
            const teamRef = doc(db, 'teams', team.id);
            await updateDoc(teamRef, {
                location: location,
            });

            setTeam(prev => prev && {
                ...prev,
                location: location,
            });

            setLocationModalVisible(false);
            setLocationInput('');
            showToast('✅ 장소가 업데이트되었습니다.');
        } catch (e) {
            console.error('❌ 장소 업데이트 실패:', e);
            showToast('⚠️ 장소 업데이트에 실패했습니다.');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.background,
                paddingTop: Platform.OS === 'android' ? insets.top : 0,
            }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (!team) {
        return (
            <SafeAreaView style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.background,
                paddingTop: Platform.OS === 'android' ? insets.top : 0,
            }}>
                <Text style={{ color: colors.text }}>모임을 찾을 수 없습니다.</Text>
            </SafeAreaView>
        );
    }


    /*const handleEnterChat = async () => {
        const user = await getCurrentUser();
        if (!user?.email) return;

        try {
            const teamDocRef = doc(db, 'teams', team.id);
            const teamSnap = await getDoc(teamDocRef);

            if (!teamSnap.exists()) {
                showToast('팀 정보를 찾을 수 없습니다.');
                return;
            }

            const teamData = teamSnap.data();
            const membersList: string[] = teamData.membersList || [];

            if (!membersList.includes(user.email)) {
                showToast('⚠️ 팀 멤버만 채팅방에 입장할 수 있습니다.');
                return;
            }

            router.push(`/teams/${team.id}/chat?name=${encodeURIComponent(team.name)}`);
        } catch (error) {
            console.error('채팅방 입장 오류:', error);
            showToast('⚠️ 채팅방 입장 중 오류가 발생했습니다.');
        }
    };*/

    // 모임이 마감된 경우나 인원이 가득 찬 경우 isFull은 true
    const isFull = isClosed || ((team?.members ?? 0) >= (team?.capacity ?? 99));

    const handleCategorySelect = (cat: { label: string; value: string }) => {
        setCategory(cat.label);
        setCategoryModalVisible(false);
        if (cat.value === '✨ 반짝소모임') {
            setSparkleModalVisible(true);
        }
    };
    const AlertAsync = (message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            Alert.alert(
                '확인',
                message,
                [
                    { text: '취소', onPress: () => resolve(false), style: 'cancel' },
                    { text: '확인', onPress: () => resolve(true) },
                ],
                { cancelable: true }
            );
        });
    };
    const handleCancelSchedule = async () => {
        try {
            if (!team?.id) return;
            const confirm = await AlertAsync('정말로 일정을 취소하시겠습니까?');

            if (confirm) {
                await updateDoc(doc(db, 'teams', team.id), {
                    scheduleDate: null,
                });
                setScheduleDate(null);
                Toast.show('일정이 취소되었습니다.');
            }
        } catch (err) {
            console.error('일정 취소 오류:', err);
            Toast.show('일정 취소에 실패했습니다.');
        }
    };

    /*
        const handleDateChange = (event: any, selectedDate?: Date) => {
            if (selectedDate) setExpirationDate(selectedDate);
            setShowDatePicker(false);
        };
    */

    return (
        <SafeAreaView style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'android' ? insets.top : 0,
        }}>
            {/* 헤더 */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                height: 56,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: colors.background,
            }}>
                {/* 뒤로가기 버튼 */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        padding: 8,
                        zIndex: 1,
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                {/* 모임 이름 */}
                <View style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <Text style={{
                        fontSize: 25,
                        fontWeight: 'bold',
                        color: colors.text,
                    }} numberOfLines={1}>
                        {team?.name || '팀 상세'}
                    </Text>
                </View>

                {/* 우측 버튼 영역 */}
                <View style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    zIndex: 1,
                }}>
                    <View style={{ alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={handleShare}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="share-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{
                            fontSize: 10,
                            color: colors.subtext,
                            marginTop: -4,
                        }}>
                            공유하기
                        </Text>
                    </View>
                    {/*<View style={{ alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={handleEnterChat}
                            style={{ padding: 8, position: 'relative' }}
                        >
                            <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
                            {chatBadgeCount > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    backgroundColor: colors.error,
                                    borderRadius: 8,
                                    minWidth: 16,
                                    height: 16,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: '#fff',
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                    }}>
                                        {chatBadgeCount}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text style={{
                            fontSize: 10,
                            color: colors.subtext,
                            marginTop: -4,
                        }}>
                            채팅방
                        </Text>
                    </View>*/}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: spacing.lg,
                    paddingBottom: spacing.xl * 4,
                    gap: spacing.lg
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={fetchTeam}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* 팀 정보 카드 */}
                <View style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    marginTop: spacing.lg,
                }}>
                    {/* 썸네일 이미지 */}
                    {team.thumbnail && (
                        /*<View
                            style={{
                                marginBottom: spacing.md,
                                borderRadius: radius.lg,
                                overflow: 'hidden',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                            }}
                        >*/
                            /*<View style={{
                                position: 'absolute',
                                width: '50%',
                                height: 120,
                                borderRadius: radius.lg,
                                backgroundColor: '#eee',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1,
                                display: loaded ? 'none' : 'flex'
                            }}>
                                <ActivityIndicator size="small" color="#888" />
                            </View>*/
                        <View
                            style={{
                                width: '100%',
                                marginBottom: spacing.md,
                                borderRadius: radius.lg,
                                overflow: 'hidden',
                            }}
                        >
                            <Image
                                source={{ uri: team.thumbnail }}
                                style={{
                                    width: '100%',
                                    aspectRatio: 16 / 9, // ✅ 비율 유지하면서 너비 꽉 차게
                                }}
                                contentFit="cover" // ✅ 이미지 일부 잘릴 수 있지만 시각적으로 좋음
                                cachePolicy="disk"
                                onLoad={() => setLoaded(true)}
                                onError={() => setLoaded(true)}
                            />
                        </View>

                        /*<Image
                            source={{ uri: team.thumbnail }}
                            style={{
                                width: '100%',
                                aspectRatio: imageAspectRatio || 1.5, // 기본값은 3:2
                                borderRadius: radius.lg,
                            }}
                            contentFit="cover"
                            contentPosition="center"
                        />*/
                        // </View>
                    )}

                    {/* 팀 이름 */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: spacing.md,
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontSize: font.heading,
                                fontWeight: 'bold',
                                color: colors.text,
                            }}>
                                {team.name}
                            </Text>
                            <Text style={{
                                fontSize: font.caption,
                                color: colors.primary,
                                fontWeight: '600',
                            }}>
                                {team.category}
                            </Text>
                            <Text style={{
                                fontSize: font.caption,
                                color: colors.subtext,
                                marginTop: 2,
                            }}>
                                인원: {team.membersList?.length || 0} / {team.maxMembers === -1 ? '무제한' : team.maxMembers}
                            </Text>
                            {team.category === '✨ 반짝소모임' && (
                                <View style={{ marginTop: 8 }}>
                                    <Text style={{ fontSize: font.caption, color: colors.subtext }}>
                                        ⏰ 소모임 만료일: {
                                        team.expirationDate instanceof Timestamp
                                            ? team.expirationDate.toDate().toLocaleDateString()
                                            : new Date(team.expirationDate).toLocaleDateString()
                                    }
                                    </Text>
                                </View>
                            )}
                        </View>

                        {(isCreator || isSubLeader) && (
                            <TouchableOpacity
                                onPress={openEditModal}
                                style={{
                                    backgroundColor: colors.primary + '10',
                                    padding: spacing.sm,
                                    borderRadius: 20,
                                }}
                            >
                                <Ionicons name="pencil" size={16} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* 구분선 */}
                    <View style={{
                        height: 1,
                        backgroundColor: colors.border,
                        marginBottom: spacing.md,
                    }} />

                    {/* 모임장 정보 */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: spacing.md,
                        backgroundColor: colors.background,
                        padding: spacing.sm,
                        borderRadius: radius.md,
                    }}>
                        <View style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: colors.primary + '20',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: spacing.sm,
                        }}>
                            <Text style={{ fontSize: 16 }}>👑</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontSize: font.body,
                                color: colors.text,
                                fontWeight: '600',
                            }}>
                                {team.leader}
                            </Text>
                            <Text style={{
                                fontSize: font.caption,
                                color: colors.subtext,
                            }}>
                                모임장
                            </Text>
                        </View>
                    </View>

                    {/* 장소 & 시간 정보 */}
                    <View style={{
                        flexDirection: 'row',
                        marginBottom: spacing.md,
                        gap: spacing.sm,
                    }}>
                        <TouchableOpacity
                            onPress={() => isCreator && setLocationModalVisible(true)}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: colors.background,
                                padding: spacing.sm,
                                borderRadius: radius.md,
                                opacity: isCreator ? 1 : 0.8,
                            }}
                        >
                            <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: colors.primary + '20',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: spacing.sm,
                            }}>
                                <Ionicons name="location-outline" size={16} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={{
                                    fontSize: font.caption,
                                    color: colors.subtext,
                                    marginBottom: 2,
                                }}>
                                    모임 장소
                                </Text>
                                <Text style={{
                                    fontSize: font.body,
                                    color: colors.text,
                                    fontWeight: '500',
                                }}>
                                    {team.location || '미정'}
                                </Text>
                            </View>
                            {isCreator && (
                                <Ionicons
                                    name="chevron-forward"
                                    size={16}
                                    color={colors.subtext}
                                    style={{ marginLeft: 'auto' }}
                                />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* 설명 */}
                    {team.description && (
                        <View style={{
                            backgroundColor: colors.background,
                            padding: spacing.sm,
                            borderRadius: radius.md,
                            marginBottom: spacing.md,
                        }}>
                            <Text style={{
                                fontSize: font.caption,
                                color: colors.subtext,
                                marginBottom: 2,
                            }}>
                                모임 소개
                            </Text>
                            <Text style={{
                                fontSize: font.body,
                                color: colors.text,
                                lineHeight: 20,
                            }}>
                                {team.description}
                            </Text>
                        </View>
                    )}

                    {team.openContact && team.membersList?.includes(user?.email) && (
                        <View style={{
                            backgroundColor: colors.background,
                            padding: spacing.sm,
                            borderRadius: radius.md,
                            marginBottom: spacing.md,
                        }}>
                            <Text style={{
                                fontSize: font.caption,
                                color: colors.subtext,
                                marginBottom: 2,
                            }}>
                                🔗 연락처 / 오픈카톡
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text
                                    style={{
                                        fontSize: font.body,
                                        color: colors.text,
                                        lineHeight: 20,
                                        flex: 1,
                                        marginRight: 8,
                                    }}
                                    numberOfLines={1}
                                >
                                    {team.openContact}
                                </Text>

                                <TouchableOpacity
                                    onPress={async () => {
                                        await Clipboard.setStringAsync(team.openContact);
                                        showToast('📋 복사되었습니다');
                                    }}
                                    hitSlop={10}
                                >
                                    <Ionicons name="copy-outline" size={20} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* 가입 신청 버튼 */}
                    {!isFull && !isCreator && !team.membersList?.includes(user.email) && (
                        <TouchableOpacity
                            onPress={alreadyRequested ? undefined : handleJoin}
                            disabled={isFull || alreadyRequested}
                            style={{
                                backgroundColor: isFull || alreadyRequested ? colors.border : colors.primary,
                                paddingVertical: spacing.sm,
                                borderRadius: radius.md,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: spacing.xs,
                            }}
                        >
                            <Ionicons name="person-add-outline" size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: font.body, fontWeight: '600' }}>
                                {isFull ? '모집마감' : alreadyRequested ? '가입 신청 완료' : '가입 신청'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 일정 및 투표 섹션 */}
                <View style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    marginTop: spacing.md,
                }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: spacing.sm,
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontSize: font.body,
                                fontWeight: 'bold',
                                color: colors.text,
                            }}>
                                다음 모임 일정
                            </Text>
                            {scheduleDate ? (
                                <Text style={{
                                    fontSize: font.body,
                                    color: colors.text,
                                    marginTop: 4,
                                }}>
                                    {scheduleDate} (D{(() => {
                                    const today = new Date();
                                    const target = new Date(scheduleDate);
                                    const diff = Math.ceil((target.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                                    return diff >= 0 ? `-${diff}` : `+${Math.abs(diff)}`;
                                })()})
                                </Text>
                            ) : (
                                <Text style={{
                                    fontSize: font.body,
                                    color: colors.subtext,
                                    marginTop: 4,
                                }}>
                                    일정 미정
                                </Text>
                            )}
                        </View>
                        <View style={{ flexDirection: 'column', gap: spacing.sm }}>
                            {(isCreator || isSubLeader) && scheduleDate && (
                                <TouchableOpacity
                                    onPress={handleCancelSchedule}
                                    style={{
                                        backgroundColor: '#ffdddd',
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.sm,
                                        borderRadius: radius.md,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <Ionicons name="close-circle-outline" size={14} color="#c00" />
                                    <Text style={{ color: '#c00', fontWeight: '600' }}>일정 취소</Text>
                                </TouchableOpacity>
                            )}
                            {(isCreator || isSubLeader) && (
                                <TouchableOpacity
                                    onPress={() => setDatePickerVisible(true)}
                                    style={{
                                        backgroundColor: colors.primary + '20',
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.sm,
                                        borderRadius: radius.md,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <Ionicons name="pencil" size={14} color={colors.primary} />
                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                        {scheduleDate ? '수정' : '일정 추가'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {team.membersList?.includes(user?.email) && scheduleDate && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowVoteStatus(true);
                                        setVoteModalVisible(true);
                                    }}
                                    style={{
                                        backgroundColor: colors.primary + '20',
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.sm,
                                        borderRadius: radius.md,
                                    }}
                                >
                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                        투표 현황
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {scheduleDate && team.membersList?.includes(user?.email) && (
                        <View style={{ marginTop: spacing.sm }}>
                            {/* 가장 많은 투표와 참여율 표시 */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: colors.background,
                                padding: spacing.sm,
                                borderRadius: radius.md,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}>
                                <Text style={{
                                    fontSize: font.caption,
                                    color: colors.text,
                                    flex: 1,
                                }}>
                                    {(() => {
                                        const stats = calculateVoteStats();
                                        const maxVotes = Math.max(stats.yes, stats.no, stats.maybe);
                                        const totalMembers = team.membersList?.length || 0;
                                        const participationRate = Math.round((stats.total / totalMembers) * 100);

                                        // 최다 득표 항목들을 찾습니다
                                        const topVotes = [];
                                        if (stats.yes === maxVotes) topVotes.push({ status: '✅ 참석', count: stats.yes });
                                        if (stats.no === maxVotes) topVotes.push({ status: '❌ 불참', count: stats.no });
                                        if (stats.maybe === maxVotes) topVotes.push({ status: '🤔 미정', count: stats.maybe });

                                        // 동률인 경우 모두 표시
                                        return topVotes.map(vote => `${vote.status} ${vote.count}표`).join(' / ');
                                    })()}
                                </Text>
                                <Text style={{
                                    fontSize: font.caption,
                                    color: colors.subtext,
                                }}>
                                    {(() => {
                                        const stats = calculateVoteStats();
                                        const totalMembers = team.membersList?.length || 0;
                                        const participationRate = Math.round((stats.total / totalMembers) * 100);
                                        return `참여율 ${participationRate}%`;
                                    })()}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* 공지사항이 있는 경우에만 표시 */}
                {team.announcement && (
                    <View style={{
                        marginTop: spacing.lg,
                        padding: spacing.md,
                        backgroundColor: colors.primary + '10',
                        borderRadius: radius.md,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.primary,
                    }}>
                        <Text style={{
                            fontSize: font.caption,
                            color: colors.primary,
                            fontWeight: '600',
                            marginBottom: 4,
                        }}>
                            공지사항
                        </Text>
                        <Text style={{
                            fontSize: font.body,
                            color: colors.text,
                            lineHeight: 20,
                        }}>
                            {team.announcement}
                        </Text>
                    </View>
                )}

                <EditTeamModal
                    visible={editModalVisible}
                    onClose={() => setEditModalVisible(false)}
                    onSave={handleUpdateTeam}
                    imageURLs={imageURLs}
                    pickImage={pickImage}
                    editName={editName}
                    setEditName={setEditName}
                    editDescription={editDescription}
                    setEditDescription={setEditDescription}
                    openContact={openContact}
                    setOpenContact={setOpenContact}
                    announcement={announcement}
                    setAnnouncement={setAnnouncement}
                    editCapacity={editCapacity}
                    setEditCapacity={setEditCapacity}
                    isUnlimited={isUnlimited}
                    setIsUnlimited={setIsUnlimited}
                    category={category}
                    setCategory={setCategory}
                    isClosed={isClosed}
                    setIsClosed={setIsClosed}
                    expirationDate={expirationDate}
                    setExpirationDate={setExpirationDate}
                    colors={colors}
                    spacing={spacing}
                    radius={radius}
                />

                <LoadingModal
                    visible={updateLoading}
                    animations={loadingAnimations}
                    message="저장 중..."
                    subMessage="잠시만 기다려주세요"
                />

                <Modal
                    visible={isVoteModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setVoteModalVisible(false)}
                >
                    <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                    }}>
                        <View style={{
                            width: '80%',
                            backgroundColor: colors.surface,
                            borderRadius: radius.lg,
                            padding: spacing.lg,
                        }}>
                            <Text style={{
                                fontSize: font.body,
                                fontWeight: 'bold',
                                color: colors.text,
                                marginBottom: spacing.md,
                                textAlign: 'center',
                            }}>
                                {scheduleDate ? `${scheduleDate} 참석 여부` : '일정 투표'}
                            </Text>

                            {/* 투표 옵션 */}
                            {[
                                { status: 'yes' as VoteStatus, label: '가능', icon: '✅' },
                                { status: 'maybe' as VoteStatus, label: '미정', icon: '🤔' },
                                { status: 'no' as VoteStatus, label: '불가능', icon: '❌' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.status}
                                    onPress={() => {
                                        if (myVote === option.status) {
                                            // 같은 옵션을 선택하면 투표 취소
                                            handleVote(option.status);
                                        } else {
                                            handleVote(option.status);
                                        }
                                        setVoteModalVisible(false);
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: spacing.sm,
                                        paddingHorizontal: spacing.md,
                                        marginBottom: spacing.sm,
                                        backgroundColor: myVote === option.status ? colors.primary + '20' : 'transparent',
                                        borderRadius: radius.md,
                                        borderWidth: 1,
                                        borderColor: myVote === option.status ? colors.primary : colors.border,
                                    }}
                                >
                                    <View style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        borderWidth: 2,
                                        borderColor: myVote === option.status ? colors.primary : colors.border,
                                        marginRight: spacing.md,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                        {myVote === option.status && (
                                            <View style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: 6,
                                                backgroundColor: colors.primary,
                                            }} />
                                        )}
                                    </View>
                                    <Text style={{
                                        fontSize: font.body,
                                        color: colors.text,
                                        marginRight: spacing.sm,
                                    }}>
                                        {option.icon}
                                    </Text>
                                    <Text style={{
                                        fontSize: font.body,
                                        color: colors.text,
                                    }}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}

                            {/* 투표 현황 보기 버튼 */}
                            {/* <TouchableOpacity
                                onPress={() => {
                                    setShowVoteStatus(true);
                                }}
                                style={{
                                    backgroundColor: colors.primary + '20',
                                    paddingVertical: spacing.sm,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                    marginTop: spacing.md,
                                }}
                            >
                                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>투표 현황 보기</Text>
                            </TouchableOpacity>*/}

                            {showVoteStatus && (
                                <View style={{ marginTop: spacing.md }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        marginBottom: spacing.sm,
                                    }}>
                                        <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                                            투표 현황
                                        </Text>
                                        <Text style={{ color: colors.subtext }}>
                                            총 {Object.keys(votes).length}명 참여
                                        </Text>
                                    </View>

                                    <View style={{
                                        backgroundColor: colors.background,
                                        padding: spacing.sm,
                                        borderRadius: radius.md,
                                        marginBottom: spacing.md,
                                    }}>
                                        {[
                                            { status: 'yes', label: '✅ 참석', count: calculateVoteStats().yes },
                                            { status: 'maybe', label: '🤔 미정', count: calculateVoteStats().maybe },
                                            { status: 'no', label: '❌ 불참', count: calculateVoteStats().no },
                                        ].map((item) => (
                                            <View key={item.status} style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                paddingVertical: spacing.xs,
                                            }}>
                                                <Text style={{ color: colors.text }}>{item.label}</Text>
                                                <Text style={{ color: colors.text }}>{item.count}명</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: spacing.sm }}>
                                        투표자 명단
                                    </Text>
                                    <View style={{
                                        backgroundColor: colors.background,
                                        padding: spacing.sm,
                                        borderRadius: radius.md,
                                        maxHeight: 150,
                                    }}>
                                        <ScrollView>
                                            {Object.values(votes).map((vote) => (
                                                <View
                                                    key={vote.userId}
                                                    style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                        paddingVertical: spacing.xs,
                                                    }}
                                                >
                                                    <Text style={{ color: colors.text }}>{vote.userName}</Text>
                                                    <Text style={{ color: colors.text }}>
                                                        {vote.status === 'yes' ? '✅ 참석' :
                                                            vote.status === 'maybe' ? '🤔 미정' : '❌ 불참'}
                                                    </Text>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}

                            {/* 닫기 버튼 */}
                            <TouchableOpacity
                                onPress={() => {
                                    setVoteModalVisible(false);
                                    setSelectedVote(null);
                                }}
                                style={{
                                    paddingVertical: spacing.sm,
                                    alignItems: 'center',
                                    marginTop: spacing.sm,
                                }}
                            >
                                <Text style={{ color: colors.subtext }}>닫기</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* 일정 선택 모달 */}
                <CustomDateModal
                    isVisible={isDatePickerVisible}
                    mode="single"
                    onClose={() => setDatePickerVisible(false)}
                    onSave={(date) => {
                        setScheduleDate(date.toISOString().split('T')[0]);
                    }}
                    colors={colors}
                    spacing={spacing}
                />

                {/* 장소 선택 모달 */}
                <Modal
                    visible={isLocationModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setLocationModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <TouchableWithoutFeedback onPress={() => setLocationModalVisible(false)}>
                            <View style={{
                                flex: 1,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                justifyContent: 'flex-end'
                            }}>
                                <TouchableWithoutFeedback>
                                    <View style={{
                                        backgroundColor: colors.surface,
                                        borderTopLeftRadius: radius.lg,
                                        borderTopRightRadius: radius.lg,
                                        maxHeight: '80%',
                                    }}>
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: spacing.lg,
                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                            borderBottomColor: colors.border,
                                        }}>
                                            <Text style={{
                                                fontSize: font.heading,
                                                fontWeight: 'bold',
                                                color: colors.text,
                                            }}>
                                                장소 선택
                                            </Text>
                                            <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                                                <Ionicons name="close" size={24} color={colors.text} />
                                            </TouchableOpacity>
                                        </View>

                                        <ScrollView
                                            style={{ maxHeight: '100%' }}
                                            contentContainerStyle={{ padding: spacing.lg }}
                                            keyboardShouldPersistTaps="handled"
                                        >
                                            {/* 직접 입력 */}
                                            <View style={{ marginBottom: spacing.lg }}>
                                                <Text style={{
                                                    fontSize: font.body,
                                                    color: colors.text,
                                                    marginBottom: spacing.sm,
                                                }}>
                                                    직접 입력
                                                </Text>
                                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                                    <TextInput
                                                        value={locationInput}
                                                        onChangeText={setLocationInput}
                                                        placeholder="장소를 입력하세요"
                                                        style={{
                                                            flex: 1,
                                                            borderWidth: 1,
                                                            borderColor: colors.border,
                                                            borderRadius: radius.sm,
                                                            padding: spacing.sm,
                                                            color: colors.text,
                                                            backgroundColor: colors.background,
                                                        }}
                                                        placeholderTextColor={colors.subtext}
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() => handleUpdateLocation(locationInput)}
                                                        disabled={!locationInput.trim()}
                                                        style={{
                                                            backgroundColor: locationInput.trim() ? colors.primary : colors.border,
                                                            paddingHorizontal: spacing.lg,
                                                            justifyContent: 'center',
                                                            borderRadius: radius.sm,
                                                        }}
                                                    >
                                                        <Text style={{ color: '#fff' }}>저장</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {/* 자주 사용하는 장소 */}
                                            <View>
                                                <Text style={{
                                                    fontSize: font.body,
                                                    color: colors.text,
                                                    marginBottom: spacing.sm,
                                                }}>
                                                    자주 사용하는 장소
                                                </Text>
                                                <View style={{
                                                    flexDirection: 'row',
                                                    flexWrap: 'wrap',
                                                    gap: spacing.sm,
                                                }}>
                                                    {commonLocations.map((location) => (
                                                        <TouchableOpacity
                                                            key={location}
                                                            onPress={() => handleUpdateLocation(location)}
                                                            style={{
                                                                backgroundColor: colors.background,
                                                                paddingHorizontal: spacing.md,
                                                                paddingVertical: spacing.sm,
                                                                borderRadius: radius.sm,
                                                                borderWidth: 1,
                                                                borderColor: colors.border,
                                                            }}
                                                        >
                                                            <Text style={{ color: colors.text }}>{location}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>

                                            {/* 추후 지도 선택 기능 추가 예정 */}
                                            <TouchableOpacity
                                                style={{
                                                    marginTop: spacing.xl,
                                                    marginBottom: Platform.OS === 'ios' ? spacing.xl * 2 : spacing.xl,
                                                    padding: spacing.md,
                                                    backgroundColor: colors.background,
                                                    borderRadius: radius.md,
                                                    borderWidth: 1,
                                                    borderColor: colors.border,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    opacity: 0.5,
                                                }}
                                            >
                                                <Ionicons name="map" size={20} color={colors.text} style={{ marginRight: spacing.sm }} />
                                                <Text style={{ color: colors.text }}>지도에서 선택 (준비중)</Text>
                                            </TouchableOpacity>
                                        </ScrollView>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </Modal>

                {/* 멤버 리스트 */}
                {memberUsers.length > 0 && (
                    <View style={{
                        backgroundColor: colors.surface,
                        borderRadius: radius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.lg,
                    }}>
                        <Text style={{
                            fontSize: font.body,
                            fontWeight: '600',
                            color: colors.text,
                            marginBottom: spacing.md,
                        }}>
                            🙋 참여자 ({memberUsers.length}명)
                        </Text>

                        {[...memberUsers]
                            .sort((a, b) => {
                                if (a.email === team.leaderEmail) return -1;
                                if (b.email === team.leaderEmail) return 1;
                                if (a.email === team.subLeaderEmail) return -1;
                                if (b.email === team.subLeaderEmail) return 1;
                                return 0;
                            })
                            .map((member) => (
                                <View
                                    key={member.email}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: spacing.sm,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <Text style={{
                                            color: member.email === team.leaderEmail ? colors.primary :
                                                member.email === team.subLeaderEmail ? colors.primary : colors.text,
                                            fontWeight: (member.email === team.leaderEmail || member.email === team.subLeaderEmail) ? 'bold' : 'normal',
                                            fontSize: font.body,
                                        }}>
                                            {member.email === team.leaderEmail && '👑 '}
                                            {member.email === team.subLeaderEmail && '👮 '}
                                            {member.name}
                                        </Text>
                                        <Text style={{
                                            fontSize: font.caption,
                                            color: colors.subtext,
                                            marginLeft: spacing.sm,
                                        }}>
                                            {member.email === team.leaderEmail ? '(모임장)' :
                                                member.email === team.subLeaderEmail ? '(부모임장)' : ''}
                                        </Text>
                                    </View>

                                    {/* 설정 버튼 */}
                                    {isManager && member.email !== user.email && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                // 부모임장은 모임장을 관리할 수 없음
                                                if (isSubLeader && member.email === team.leaderEmail) {
                                                    return;
                                                }

                                                // 부모임장은 다른 부모임장을 관리할 수 없음
                                                if (isSubLeader && member.email === team.subLeaderEmail) {
                                                    return;
                                                }

                                                Alert.alert(
                                                    '멤버 관리',
                                                    `${member.name}님을 어떻게 하시겠습니까?`,
                                                    [
                                                        { text: '취소', style: 'cancel' },
                                                        // 부모임장 임명/해제는 모임장만 가능
                                                        ...(isCreator ? [{
                                                            text: member.email === team.subLeaderEmail ? '부모임장 해제' : '부모임장 임명',
                                                            onPress: async () => {
                                                                try {
                                                                    const teamRef = doc(db, 'teams', team.id);
                                                                    if (member.email === team.subLeaderEmail) {
                                                                        await updateDoc(teamRef, {
                                                                            subLeaderEmail: null
                                                                        });
                                                                        showToast('✅ 부모임장이 해제되었습니다.');
                                                                    } else {
                                                                        await updateDoc(teamRef, {
                                                                            subLeaderEmail: member.email
                                                                        });
                                                                        showToast('✅ 부모임장이 임명되었습니다.');
                                                                    }
                                                                } catch (e) {
                                                                    console.error('❌ 부모임장 설정 실패:', e);
                                                                    showToast('⚠️ 부모임장 설정에 실패했습니다.');
                                                                }
                                                            }
                                                        }] : []),
                                                        // 일반 멤버 강퇴는 모임장과 부모임장 모두 가능
                                                        {
                                                            text: '강퇴',
                                                            style: 'destructive',
                                                            onPress: () => handleKick(member.email)
                                                        }
                                                    ]
                                                );
                                            }}
                                            style={{
                                                padding: spacing.sm,
                                            }}
                                        >
                                            <Ionicons name="ellipsis-vertical" size={20} color={colors.subtext} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                        {/* 탈퇴하기 버튼 (모임장이 아닌 멤버만 보임) */}
                        {!isCreator && team.membersList?.includes(user?.email) && (
                            <TouchableOpacity
                                onPress={() => {
                                    Alert.alert(
                                        '모임 탈퇴',
                                        '정말 모임을 탈퇴하시겠습니까?',
                                        [
                                            { text: '취소', style: 'cancel' },
                                            {
                                                text: '탈퇴',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    try {
                                                        const teamRef = doc(db, 'teams', team.id);
                                                        await updateDoc(teamRef, {
                                                            membersList: arrayRemove(user.email),
                                                            members: increment(-1),
                                                        });
                                                        showToast('✅ 모임에서 탈퇴했습니다.');
                                                        router.back();
                                                    } catch (error) {
                                                        console.error('탈퇴 실패:', error);
                                                        showToast('⚠️ 탈퇴에 실패했습니다.');
                                                    }
                                                },
                                            },
                                        ]
                                    );
                                }}
                                style={{
                                    marginTop: spacing.md,
                                    paddingVertical: spacing.sm,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                    backgroundColor: colors.error + '10',
                                }}
                            >
                                <Text style={{ color: colors.error, fontSize: font.body }}>
                                    모임 탈퇴하기
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* 모임장 탈퇴 버튼 */}
                        {isCreator && (
                            <TouchableOpacity
                                onPress={() => {
                                    Alert.alert(
                                        '모임장 탈퇴',
                                        '모임장이 탈퇴하면 모임이 자동으로 삭제됩니다.\n정말 탈퇴하시겠습니까?',
                                        [
                                            { text: '취소', style: 'cancel' },
                                            {
                                                text: '탈퇴 및 모임 삭제',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    try {
                                                        // 1. 모든 멤버에게 알림 보내기
                                                        const memberEmails = team.membersList.filter(email => email !== user.email);
                                                        const notificationPromises = memberEmails.map(email =>
                                                            sendNotification({
                                                                to: email,
                                                                message: `"${team.name}" 모임이 모임장의 탈퇴로 인해 삭제되었습니다.`,
                                                                type: 'team_deleted',
                                                                teamName: team.name,
                                                            })
                                                        );

                                                        // 2. 푸시 알림 보내기
                                                        const tokenQueryBatches = [];
                                                        const emailClone = [...memberEmails];
                                                        while (emailClone.length) {
                                                            const batch = emailClone.splice(0, 10);
                                                            tokenQueryBatches.push(
                                                                query(collection(db, 'expoTokens'), where('email', 'in', batch))
                                                            );
                                                        }

                                                        const tokenSnapshots = await Promise.all(tokenQueryBatches.map(q => getDocs(q)));
                                                        const tokens = tokenSnapshots.flatMap(snap =>
                                                            snap.docs.map(doc => doc.data().token).filter(Boolean)
                                                        );

                                                        if (tokens.length > 0) {
                                                            await sendPushNotification({
                                                                to: tokens,
                                                                title: '모임 삭제 알림',
                                                                body: `"${team.name}" 모임이 모임장의 탈퇴로 인해 삭제되었습니다.`,
                                                            });
                                                        }

                                                        // 3. 모임 삭제
                                                        await deleteDoc(doc(db, 'teams', team.id));

                                                        showToast('✅ 모임에서 탈퇴했습니다.');
                                                        router.replace('/teams');
                                                    } catch (error) {
                                                        console.error('모임장 탈퇴 실패:', error);
                                                        showToast('⚠️ 탈퇴에 실패했습니다.');
                                                    }
                                                },
                                            },
                                        ]
                                    );
                                }}
                                style={{
                                    marginTop: spacing.md,
                                    paddingVertical: spacing.sm,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                    backgroundColor: colors.error + '10',
                                }}
                            >
                                <Text style={{ color: colors.error, fontSize: font.body }}>
                                    모임장 탈퇴하기
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* 하단 버튼 영역 */}
                <View style={{ gap: spacing.md }}>
                    {/* 관리자 버튼 */}
                    {isManager && (
                        <>
                            <TouchableOpacity
                                onPress={openEditModal}
                                style={{
                                    backgroundColor: colors.primary,
                                    paddingVertical: spacing.md,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>
                                    ✏️ 모임 정보 수정
                                </Text>
                            </TouchableOpacity>

                            {isCreator && (
                                <TouchableOpacity
                                    onPress={() => deleteTeam(team.id)}
                                    style={{
                                        backgroundColor: colors.error,
                                        paddingVertical: spacing.md,
                                        borderRadius: radius.md,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>
                                        🗑️ 모임 삭제하기
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {/* 가입 신청 버튼 */}
                    {!isFull && !isCreator && !team.membersList?.includes(user.email) && (
                        <TouchableOpacity
                            onPress={alreadyRequested ? undefined : handleJoin}
                            disabled={isFull || alreadyRequested}
                            style={{
                                backgroundColor: isFull || alreadyRequested ? colors.border : colors.primary,
                                paddingVertical: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: font.body, fontWeight: '600' }}>
                                {isClosed ? '모임 마감됨' : isFull ? '모집마감' : alreadyRequested ? '가입 신청 완료' : '가입 신청하기'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
