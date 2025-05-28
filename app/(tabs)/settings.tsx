import DeviceManager from '@/components/DeviceManager';
import ThemeToggle from "@/components/ThemeToggle";
import PushSettings from "@/components/VerseNotificationSettings";
import { useDesign } from '@/context/DesignSystem';
import { useAppTheme } from '@/context/ThemeContext';
import { db } from '@/firebase/config';
import { useAppDispatch } from '@/hooks/useRedux';
import { clearPrayers } from "@/redux/slices/prayerSlice";
import { clearTeams } from "@/redux/slices/teamSlice";
import { logoutUser } from "@/redux/slices/userSlice";
import { removeDeviceToken } from "@/services/registerPushToken";
import { setScrollCallback } from "@/utils/scrollRefManager";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from "bcryptjs";
import { useRouter } from 'expo-router';
import { deleteDoc, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert, Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import Toast from 'react-native-root-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import loading4 from '@/assets/lottie/Animation - 1747201330128.json';
import loading3 from '@/assets/lottie/Animation - 1747201413764.json';
import loading2 from '@/assets/lottie/Animation - 1747201431992.json';
import loading1 from '@/assets/lottie/Animation - 1747201461030.json';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SettingsScreen() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';
    const { colors, spacing, font, radius } = useDesign();
    const insets = useSafeAreaInsets();
    const horizontalMargin = Platform.OS === 'ios' ? 20 : 16;

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const dispatch = useAppDispatch();

    const [showEditProfile, setShowEditProfile] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editValues, setEditValues] = useState<Record<string, string>>({});

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [passwordStage, setPasswordStage] = useState<'verify' | 'new'>('verify');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingAnimation, setLoadingAnimation] = useState<any>(null); // 선택된 애니메이션
    const loadingAnimations = [loading1, loading2, loading3, loading4];

    // const [notificationModalVisible, setNotificationModalVisible] = useState(false); // ✅ 알림 모달 상태

    if (!bcrypt.setRandomFallback) {
        console.warn('⚠️ bcryptjs 버전이 올바르지 않습니다.');
    }

// ✅ RN 환경에서는 setRandomFallback을 등록해줘야 합니다
    bcrypt.setRandomFallback((len: number) => {
        const result = [];
        for (let i = 0; i < len; i++) {
            result.push(Math.floor(Math.random() * 256));
        }
        return result;
    });

    useEffect(() => {
        setScrollCallback('settings', () => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        });
    }, []);

    useEffect(() => {
        let unsubscribe: () => void;

        const listenUser = async () => {
            const raw = await AsyncStorage.getItem('currentUser');
            if (!raw) return;
            const cachedUser = JSON.parse(raw);
            const userRef = doc(db, 'users', cachedUser.email);

            unsubscribe = onSnapshot(userRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const fresh = { ...docSnap.data(), email: cachedUser.email };
                    setUser(fresh); // ✅ 실시간 업데이트
                    await AsyncStorage.setItem('currentUser', JSON.stringify(fresh));
                }
            });
        };

        listenUser();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const handleEditToggle = () => {
        if (!showEditProfile && user) {
            setEditValues({
                name: user.name ?? '',
                email: user.email ?? '',
                division: user.division ?? '',
                campus: user.campus ?? '',
                role: user.role ?? '',
            });
        }
        setShowEditProfile(prev => !prev);
    };

    const handleUpgrade = async () => {
        if (!user?.email) return;

        const updatedUser = { ...user, role: '정회원' };
        await updateDoc(doc(db, 'users', user.email), { role: '정회원' });
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setShowUpgradeModal(false);
        Toast.show('✅ 정회원으로 전환되었습니다.', {
            duration: Toast.durations.SHORT,
            position: Toast.positions.BOTTOM,
        });
    };

    const handleLogout = async () => {
        await removeDeviceToken();
        await AsyncStorage.removeItem('currentUser');
        await AsyncStorage.removeItem('useBiometric');
        dispatch(logoutUser());
        dispatch(clearPrayers());
        dispatch(clearTeams());
        router.replace('/auth/login');
    };

    const handleSaveProfile = async () => {
        if (!user?.name) return; // 문서 ID로 name을 사용 중

        const updatedFields: Record<string, string> = {};
        Object.entries(editValues).forEach(([key, value]) => {
            if (value !== user[key]) {
                updatedFields[key] = value;
            }
        });

        if (Object.keys(updatedFields).length === 0) {
            Toast.show('변경된 내용이 없습니다.', {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
            });
            return;
        }

        try {
            // 🔧 문서 ID로 name 사용
            await updateDoc(doc(db, 'users', user.email), updatedFields);

            const updatedUser = { ...user, ...updatedFields };
            setUser(updatedUser);
            await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

            Toast.show('✅ 정보가 수정되었습니다.', {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
            });

            setShowEditProfile(false);
        } catch (err) {
            console.error(err);
            Alert.alert('수정 실패', '다시 시도해주세요.');
        }
    };

    const handleDeleteAccount = async () => {
        if (!user?.email) return;

        Alert.alert(
            '계정 탈퇴',
            '정말로 계정을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'users', user.email)); // 🔥 Firestore 삭제
                            await AsyncStorage.removeItem('currentUser'); // 로컬 삭제

                            dispatch(logoutUser());
                            dispatch(clearPrayers());
                            dispatch(clearTeams());

                            Toast.show('👋 계정이 삭제되었습니다.', {
                                duration: Toast.durations.SHORT,
                                position: Toast.positions.BOTTOM,
                            });

                            router.replace('/auth/login');
                        } catch (err) {
                            Alert.alert('오류 발생', '계정 삭제에 실패했습니다.');
                        }
                    },
                },
            ]
        );
    };

    // 재인증 함수 추가
    const reauthenticate = async (email: string, password: string) => {
        const userRef = doc(db, 'users', email);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('사용자를 찾을 수 없습니다.');

        const userData = userSnap.data();
        const isValid = await bcrypt.compare(password, userData.password);
        if (!isValid) throw { code: 'auth/wrong-password' };

        return true;
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top + 10 : 0 }}>
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={{ 
                    paddingHorizontal: 20,
                    paddingBottom: 40 
                }} 
                showsVerticalScrollIndicator={false}
            >
                {/* 헤더 */}
                <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    marginBottom: 32,
                    marginTop: 12
                }}>
                    <Text style={{ 
                        flex: 1,
                        fontSize: 32, 
                        fontWeight: '700', 
                        color: colors.text 
                    }}>
                        설정
                    </Text>
                </View>

                {/* 프로필 카드 */}
                {user && (
                    <View style={{
                        backgroundColor: colors.surface,
                        borderRadius: 24,
                        padding: 20,
                        marginBottom: 32,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        elevation: 3
                    }}>
                        <View style={{ 
                            flexDirection: 'row', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: 16
                        }}>
                            <View>
                                <Text style={{ 
                                    fontSize: 24, 
                                    fontWeight: '700', 
                                    color: colors.text,
                                    marginBottom: 4
                                }}>
                                    {user?.name ?? '이름'}
                                </Text>
                                <Text style={{ 
                                    fontSize: 15, 
                                    color: colors.subtext 
                                }}>
                                    {user?.email ?? '이메일'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleEditToggle}
                                style={{
                                    backgroundColor: colors.primary + '15',
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    borderRadius: 12,
                                }}
                            >
                                <Text style={{ 
                                    color: colors.primary, 
                                    fontSize: 14,
                                    fontWeight: '600'
                                }}>
                                    프로필 수정
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* 뱃지 영역 */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {user?.division && (
                                <View style={{
                                    backgroundColor: '#E3F2FD',
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 12
                                }}>
                                    <Text style={{ 
                                        color: '#1976D2', 
                                        fontSize: 13,
                                        fontWeight: '600'
                                    }}>
                                        {user.division}
                                    </Text>
                                </View>
                            )}
                            {user?.role && (
                                <View style={{
                                    backgroundColor: '#E8F5E9',
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 12
                                }}>
                                    <Text style={{ 
                                        color: '#2E7D32', 
                                        fontSize: 13,
                                        fontWeight: '600'
                                    }}>
                                        {user.role}
                                    </Text>
                                </View>
                            )}
                            {user?.campus && (
                                <View style={{
                                    backgroundColor: '#FDECEC',
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 12
                                }}>
                                    <Text style={{ 
                                        color: '#ff9191', 
                                        fontSize: 13,
                                        fontWeight: '600'
                                    }}>
                                        {user.campus}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* 일반 설정 섹션 */}
                <View style={{ marginBottom: 32 }}>
                    <Text style={{ 
                        fontSize: 18, 
                        fontWeight: '600', 
                        color: colors.text,
                        marginBottom: 16,
                        paddingLeft: 4
                    }}>
                        일반
                    </Text>
                    
                    <View style={{ gap: 12 }}>
                        {/* 내 모임 관리 */}
                        <TouchableOpacity
                            onPress={() => router.push('/setting/joinTeams')}
                            style={{
                                backgroundColor: colors.surface,
                                padding: 20,
                                borderRadius: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.06,
                                shadowRadius: 6,
                                elevation: 2
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#d1fae5',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="accessibility-outline" size={20} color="#10b981" />
                                </View>
                                <Text style={{ fontSize: 16, color: colors.text }}>내 모임 관리</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                        </TouchableOpacity>

                        {/* 다크모드 */}
                        <View style={{
                            backgroundColor: colors.surface,
                            padding: 20,
                            borderRadius: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.06,
                            shadowRadius: 6,
                            elevation: 2
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons 
                                        name={isDark ? "moon" : "sunny"} 
                                        size={20} 
                                        color={isDark ? "#9ca3af" : "#6b7280"} 
                                    />
                                </View>
                                <Text style={{ fontSize: 16, color: colors.text }}>다크모드</Text>
                            </View>
                            <ThemeToggle />
                        </View>

                        {/* 알림 설정 */}
                        <View style={{
                            backgroundColor: colors.surface,
                            padding: 20,
                            borderRadius: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.06,
                            shadowRadius: 6,
                            elevation: 2
                        }}>
                            <PushSettings />
                        </View>
                    </View>
                </View>

                {/* 관리자 설정 */}
                {user?.role === '교역자' && (
                    <View style={{ marginBottom: 32 }}>
                        <Text style={{ 
                            fontSize: 18, 
                            fontWeight: '600', 
                            color: colors.text,
                            marginBottom: 16,
                            paddingLeft: 4
                        }}>
                            관리자
                        </Text>
                        
                        <View style={{ gap: 12 }}>
                            {/* 공지사항 관리 */}
                            <TouchableOpacity
                                onPress={() => router.push('/setting/noticeManager')}
                                style={{
                                    backgroundColor: colors.surface,
                                    padding: 20,
                                    borderRadius: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.06,
                                    shadowRadius: 6,
                                    elevation: 2
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: '#d1fae5',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Ionicons name="megaphone-outline" size={20} color="#10b981" />
                                    </View>
                                    <Text style={{ fontSize: 16, color: colors.text }}>공지사항 관리</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                            </TouchableOpacity>

                            {/* 유튜브 영상 관리 */}
                            <TouchableOpacity
                                onPress={() => router.push('/setting/videoManager')}
                                style={{
                                    backgroundColor: colors.surface,
                                    padding: 20,
                                    borderRadius: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.06,
                                    shadowRadius: 6,
                                    elevation: 2
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: '#fee2e2',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Ionicons name="videocam-outline" size={20} color="#ef4444" />
                                    </View>
                                    <Text style={{ fontSize: 16, color: colors.text }}>유튜브 영상 관리</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* 기타 설정 */}
                <View style={{ marginBottom: 32 }}>
                    <Text style={{ 
                        fontSize: 18, 
                        fontWeight: '600', 
                        color: colors.text,
                        marginBottom: 16,
                        paddingLeft: 4
                    }}>
                        기타
                    </Text>
                    
                    <View style={{ gap: 12 }}>
                        {/* 피드백 */}
                        <TouchableOpacity
                            onPress={() => router.push('/setting/feedback')}
                            style={{
                                backgroundColor: colors.surface,
                                padding: 20,
                                borderRadius: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.06,
                                shadowRadius: 6,
                                elevation: 2
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#ddd6fe',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="chatbox-outline" size={20} color="#7c3aed" />
                                </View>
                                <Text style={{ fontSize: 16, color: colors.text }}>피드백 보내기</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                        </TouchableOpacity>

                        {/* 로그인된 기기 */}
                        <TouchableOpacity
                            onPress={() => setModalVisible(true)}
                            style={{
                                backgroundColor: colors.surface,
                                padding: 20,
                                borderRadius: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.06,
                                shadowRadius: 6,
                                elevation: 2
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#e0f2fe',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="phone-portrait-outline" size={20} color="#0284c7" />
                                </View>
                                <Text style={{ fontSize: 16, color: colors.text }}>로그인된 기기</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 계정 설정 */}
                <View style={{ marginBottom: 32 }}>
                    <Text style={{ 
                        fontSize: 18, 
                        fontWeight: '600', 
                        color: colors.text,
                        marginBottom: 16,
                        paddingLeft: 4
                    }}>
                        계정
                    </Text>
                    
                    <View style={{ gap: 12 }}>
                        {/* 비밀번호 찾기 */}
                        <TouchableOpacity
                            onPress={() => router.push('/setting/ForgotPassword')}
                            style={{
                                backgroundColor: colors.surface,
                                padding: 20,
                                borderRadius: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.06,
                                shadowRadius: 6,
                                elevation: 2
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#fef3c7',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="key-outline" size={20} color="#d97706" />
                                </View>
                                <Text style={{ fontSize: 16, color: colors.text }}>비밀번호 찾기</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                        </TouchableOpacity>

                        {/* 회원 탈퇴 */}
                        <TouchableOpacity
                            onPress={handleDeleteAccount}
                            style={{
                                backgroundColor: colors.surface,
                                padding: 20,
                                borderRadius: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.06,
                                shadowRadius: 6,
                                elevation: 2
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#fee2e2',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                </View>
                                <Text style={{ fontSize: 16, color: colors.error }}>회원 탈퇴</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.error} />
                        </TouchableOpacity>

                        {/* 로그아웃 */}
                        <TouchableOpacity
                            onPress={handleLogout}
                            style={{
                                backgroundColor: colors.surface,
                                padding: 20,
                                borderRadius: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.06,
                                shadowRadius: 6,
                                elevation: 2
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#fee2e2',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                                </View>
                                <Text style={{ fontSize: 16, color: colors.error }}>로그아웃</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.error} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 정회원 전환 모달 */}
                {user?.role === '새가족' && (
                    <Modal visible={showUpgradeModal} transparent animationType="fade">
                        <View style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <View style={{
                                backgroundColor: colors.surface,
                                borderRadius: 24,
                                padding: 24,
                                width: '85%',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.1,
                                shadowRadius: 12,
                                elevation: 5
                            }}>
                                <Text style={{
                                    fontSize: 20,
                                    fontWeight: '600',
                                    color: colors.text,
                                    marginBottom: 8
                                }}>
                                    정회원 전환
                                </Text>
                                <Text style={{
                                    fontSize: 15,
                                    color: colors.subtext,
                                    marginBottom: 24,
                                    lineHeight: 20
                                }}>
                                    교역자나 목회자에게 확인받고{'\n'}정회원으로 전환해주세요.
                                </Text>

                                <TouchableOpacity
                                    onPress={handleUpgrade}
                                    style={{
                                        backgroundColor: colors.primary,
                                        paddingVertical: 16,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        marginBottom: 12
                                    }}
                                >
                                    <Text style={{ 
                                        color: '#fff', 
                                        fontSize: 16,
                                        fontWeight: '600'
                                    }}>
                                        정회원 전환하기
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setShowUpgradeModal(false)}
                                    style={{
                                        paddingVertical: 16,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{ 
                                        color: colors.subtext,
                                        fontSize: 15
                                    }}>
                                        닫기
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                )}

                {/* 기존 모달들 유지 */}
                <DeviceManager visible={modalVisible} onClose={() => setModalVisible(false)} />
                {/* ... 나머지 모달들 ... */}

                {/* 프로필 수정 모달 */}
                <Modal visible={showEditProfile} transparent animationType="fade">
                    <View style={{ 
                        flex: 1, 
                        backgroundColor: 'rgba(0,0,0,0.5)', 
                        justifyContent: 'center', 
                        alignItems: 'center' 
                    }}>
                        <View style={{ 
                            width: '90%', 
                            backgroundColor: colors.surface, 
                            borderRadius: 24,
                            padding: 24,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            elevation: 5
                        }}>
                            <Text style={{
                                fontSize: 24,
                                fontWeight: '700',
                                color: colors.text,
                                marginBottom: 24,
                                textAlign: 'center',
                            }}>
                                프로필 수정
                            </Text>

                            {/* 입력 필드들 */}
                            {[
                                { label: '이름', key: 'name' },
                                { label: '이메일', key: 'email' },
                                { label: '부서', key: 'division' },
                                { label: '캠퍼스', key: 'campus' },
                            ].map(({ label, key }) => (
                                <View key={key} style={{ marginBottom: 16 }}>
                                    <Text style={{
                                        fontSize: 15,
                                        color: colors.subtext,
                                        fontWeight: '600',
                                        marginBottom: 8,
                                    }}>
                                        {label}
                                    </Text>
                                    <TextInput
                                        placeholder={`${label} 입력`}
                                        value={editValues[key]}
                                        onChangeText={text => setEditValues(prev => ({ ...prev, [key]: text }))}
                                        style={{
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            borderRadius: 16,
                                            paddingHorizontal: 16,
                                            paddingVertical: Platform.OS === 'ios' ? 16 : 12,
                                            color: colors.text,
                                            backgroundColor: colors.card,
                                            fontSize: 16
                                        }}
                                        placeholderTextColor={colors.subtext}
                                    />
                                </View>
                            ))}

                            {/* 비밀번호 변경 버튼 */}
                            <TouchableOpacity
                                onPress={() => setShowPasswordFields(prev => !prev)}
                                style={{
                                    backgroundColor: colors.primary + '15',
                                    padding: 16,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    marginBottom: 24,
                                }}
                            >
                                <Text style={{ 
                                    color: colors.primary,
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
                                    비밀번호 변경
                                </Text>
                            </TouchableOpacity>

                            {/* 저장 버튼 */}
                            <TouchableOpacity
                                onPress={handleSaveProfile}
                                style={{
                                    backgroundColor: colors.primary,
                                    padding: 16,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    marginBottom: 12,
                                }}
                            >
                                <Text style={{ 
                                    color: '#fff',
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
                                    저장하기
                                </Text>
                            </TouchableOpacity>

                            {/* 닫기 버튼 */}
                            <TouchableOpacity 
                                onPress={() => setShowEditProfile(false)}
                                style={{
                                    padding: 16,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ 
                                    color: colors.subtext,
                                    fontSize: 16
                                }}>
                                    닫기
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* 비밀번호 변경 모달 */}
                <Modal visible={showPasswordFields} transparent animationType="fade">
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <View style={{
                            width: '90%',
                            backgroundColor: colors.surface,
                            borderRadius: 24,
                            padding: 24,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            elevation: 5
                        }}>
                            <Text style={{
                                fontSize: 24,
                                fontWeight: '700',
                                color: colors.text,
                                marginBottom: 24,
                            }}>
                                비밀번호 변경
                            </Text>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={{
                                    fontSize: 15,
                                    color: colors.subtext,
                                    fontWeight: '600',
                                    marginBottom: 8,
                                }}>
                                    기존 비밀번호
                                </Text>
                                <TextInput
                                    placeholder="기존 비밀번호 입력"
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                    secureTextEntry={!showPassword}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: 16,
                                        paddingHorizontal: 16,
                                        paddingVertical: Platform.OS === 'ios' ? 16 : 12,
                                        color: colors.text,
                                        backgroundColor: colors.card,
                                        fontSize: 16
                                    }}
                                    placeholderTextColor={colors.subtext}
                                />
                            </View>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={{
                                    fontSize: 15,
                                    color: colors.subtext,
                                    fontWeight: '600',
                                    marginBottom: 8,
                                }}>
                                    새 비밀번호
                                </Text>
                                <TextInput
                                    placeholder="새 비밀번호 입력"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showPassword}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: 16,
                                        paddingHorizontal: 16,
                                        paddingVertical: Platform.OS === 'ios' ? 16 : 12,
                                        color: colors.text,
                                        backgroundColor: colors.card,
                                        fontSize: 16
                                    }}
                                    placeholderTextColor={colors.subtext}
                                />
                            </View>

                            {/* 비밀번호 보기/숨기기 토글 */}
                            <TouchableOpacity 
                                onPress={() => setShowPassword(prev => !prev)} 
                                style={{ 
                                    marginBottom: 24,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                <Ionicons 
                                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                    size={20} 
                                    color={colors.primary} 
                                />
                                <Text style={{ color: colors.primary }}>
                                    {showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                                </Text>
                            </TouchableOpacity>

                            {/* 변경 버튼 */}
                            <TouchableOpacity
                                onPress={() => {
                                    if (loading) return;
                                    if (!user?.email || !oldPassword || !newPassword) {
                                        Alert.alert('입력 누락', '기존/새 비밀번호를 모두 입력해주세요.');
                                        return;
                                    }

                                    const randomIndex = Math.floor(Math.random() * loadingAnimations.length);
                                    setLoadingAnimation(loadingAnimations[randomIndex]);
                                    setLoading(true);

                                    setTimeout(async () => {
                                        try {
                                            await reauthenticate(user.email, oldPassword);
                                            const hashed = await bcrypt.hash(newPassword, 10);
                                            await updateDoc(doc(db, 'users', user.email), { password: hashed });
                                            const updatedUser = { ...user, password: hashed };
                                            await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

                                            setOldPassword('');
                                            setNewPassword('');
                                            setShowPasswordFields(false);
                                            setLoading(false);
                                            Toast.show('✅ 비밀번호가 변경되었습니다.', {
                                                duration: Toast.durations.SHORT,
                                                position: Toast.positions.BOTTOM,
                                            });
                                        } catch (err: any) {
                                            const message =
                                                err.code === 'auth/wrong-password'
                                                    ? '기존 비밀번호가 일치하지 않습니다.'
                                                    : err.message || '비밀번호 변경 중 오류가 발생했습니다.';
                                            Alert.alert('변경 실패', message);
                                        } finally {
                                            setTimeout(() => setLoading(false), 3000);
                                        }
                                    }, 100);
                                }}
                                style={{
                                    backgroundColor: loading ? colors.subtext : colors.primary,
                                    padding: 16,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    marginBottom: 12,
                                    opacity: loading ? 0.7 : 1,
                                }}
                                disabled={loading}
                            >
                                <Text style={{ 
                                    color: '#fff',
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
                                    {loading ? '변경 중...' : '비밀번호 변경하기'}
                                </Text>
                            </TouchableOpacity>

                            {/* 닫기 버튼 */}
                            <TouchableOpacity
                                onPress={() => {
                                    setShowPasswordFields(false);
                                    setOldPassword('');
                                    setNewPassword('');
                                }}
                                style={{
                                    padding: 16,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ 
                                    color: colors.subtext,
                                    fontSize: 16
                                }}>
                                    닫기
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* 로딩 모달 */}
                {loading && (
                    <Modal visible={true} transparent animationType="fade">
                        <View style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            zIndex: 9999,
                        }}>
                            {loadingAnimation && (
                                <LottieView
                                    source={loadingAnimation}
                                    autoPlay
                                    loop
                                    style={{ width: 200, height: 200 }}
                                />
                            )}
                            <Text style={{ 
                                color: '#fff', 
                                marginTop: 16,
                                fontSize: 16
                            }}>
                                비밀번호 변경 중...
                            </Text>
                        </View>
                    </Modal>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}
