import React, {useEffect, useRef, useState} from 'react';
import {
    View, Text, TouchableOpacity, SafeAreaView, Platform, ScrollView, KeyboardAvoidingView, Alert, Modal, FlatList,
    LayoutAnimation, UIManager, TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useDesign } from '@/context/DesignSystem';
import ThemeToggle from "@/components/ThemeToggle";
import PushSettings from "@/components/VerseNotificationSettings";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {doc, updateDoc, onSnapshot, deleteDoc} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { removeDeviceToken } from "@/services/registerPushToken";
import { logoutUser } from "@/redux/slices/userSlice";
import { clearPrayers } from "@/redux/slices/prayerSlice";
import { clearTeams } from "@/redux/slices/teamSlice";
import { useAppDispatch } from '@/hooks/useRedux';
import Toast from 'react-native-root-toast';
import { setScrollCallback } from "@/utils/scrollRefManager";
import DeviceManager from '@/components/DeviceManager';
import {changePassword, reauthenticate} from "@/services/authService";

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
    // const [notificationModalVisible, setNotificationModalVisible] = useState(false); // ✅ 알림 모달 상태

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
            await updateDoc(doc(db, 'users', user.name), updatedFields);

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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top + 10 : 0 }}>
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: 40, paddingHorizontal: horizontalMargin }} showsVerticalScrollIndicator={false}>

                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg }}>⚙️ 설정</Text>
                {/* 👤 상단 프로필 카드 */}
                {user && (

                    <View
                        style={{
                            backgroundColor: colors.surface,
                            borderRadius: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 16,
                            marginBottom: 20,
                        }}
                    >
                        {/* 유저 정보 영역 */}
                        <View>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>{user?.name ?? '이름'}</Text>
                            <Text style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{user?.email ?? '0000'}</Text>

                            {/* 뱃지 */}
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                                {user?.division && (
                                    <View
                                        style={{
                                            backgroundColor: '#E3F2FD',
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                            borderRadius: 12,
                                        }}
                                    >
                                        <Text style={{ color: '#1976D2', fontSize: 12, fontWeight: 'bold' }}>
                                            {user.division}
                                        </Text>
                                    </View>
                                )}
                                {user?.campus && (
                                    <View
                                        style={{
                                            backgroundColor: '#E8F5E9',
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                            borderRadius: 12,
                                        }}
                                    >
                                        <Text style={{ color: '#2E7D32', fontSize: 12, fontWeight: 'bold' }}>
                                            {user.campus}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* 수정 버튼 */}
                        <TouchableOpacity
                            onPress={handleEditToggle}
                            style={{
                                borderWidth: 1,
                                borderColor: '#555',
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                            }}
                        >
                            <Text style={{ color: colors.text, fontSize: 14 }}>✏️ 내 정보 수정</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* 👤 내 정보 수정 모달 */}
                <Modal visible={showEditProfile} transparent animationType="fade">
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{
                            width: '90%',
                            backgroundColor: colors.surface,
                            borderRadius: 16,
                            padding: spacing.lg,
                            shadowColor: '#000',
                            shadowOpacity: 0.1,
                            shadowRadius: 10,
                        }}>
                            {/* 타이틀 */}
                            <Text style={{
                                fontSize: 20,
                                fontWeight: 'bold',
                                color: colors.primary,
                                marginBottom: spacing.lg,
                                textAlign: 'center',
                            }}>
                                ✏️ 내 정보 수정
                            </Text>

                            {/* 일반 필드 */}
                            {[
                                { label: '이름', key: 'name' },
                                { label: '이메일', key: 'email' },
                                { label: '부서', key: 'division' },
                                { label: '캠퍼스', key: 'campus' },
                            ].map(({ label, key }) => (
                                <View key={key} style={{ marginBottom: spacing.md }}>
                                    <Text style={{
                                        fontSize: font.caption,
                                        color: colors.subtext,
                                        fontWeight: '600',
                                        marginBottom: 4,
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
                                            borderRadius: 10,
                                            paddingHorizontal: spacing.sm,
                                            paddingVertical: Platform.OS === 'ios' ? 12 : 10,
                                            color: colors.text,
                                            backgroundColor: colors.card,
                                        }}
                                    />
                                </View>
                            ))}

                            {/* 비밀번호 변경 토글 */}
                            <TouchableOpacity
                                onPress={() => setShowPasswordFields(prev => !prev)}
                                style={{
                                    backgroundColor: colors.border,
                                    padding: spacing.sm,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    marginTop: spacing.md,
                                    marginBottom: showPasswordFields ? spacing.sm : spacing.md,
                                }}
                            >
                                <Text style={{ color: colors.text }}>🔒 비밀번호 변경</Text>
                            </TouchableOpacity>

                            {/* 비밀번호 필드 */}
                            {/*{showPasswordFields && (
                                <>
                                    <View style={{ marginBottom: spacing.md }}>
                                        <Text style={{ fontSize: font.caption, fontWeight: '600', color: colors.subtext, marginBottom: 4 }}>
                                            기존 비밀번호
                                        </Text>
                                        <TextInput
                                            // secureTextEntry
                                            placeholder="기존 비밀번호"
                                            value={oldPassword}
                                            onChangeText={setOldPassword}
                                            style={{
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                borderRadius: 10,
                                                padding: spacing.sm,
                                                color: colors.text,
                                                backgroundColor: colors.card,
                                            }}
                                        />
                                    </View>

                                    <View style={{ marginBottom: spacing.md }}>
                                        <Text style={{ fontSize: font.caption, fontWeight: '600', color: colors.subtext, marginBottom: 4 }}>
                                            새 비밀번호
                                        </Text>
                                        <TextInput
                                            // secureTextEntry
                                            placeholder="새 비밀번호"
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            style={{
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                borderRadius: 10,
                                                padding: spacing.sm,
                                                color: colors.text,
                                                backgroundColor: colors.card,
                                            }}
                                        />
                                    </View>

                                     비밀번호 변경 버튼
                                    <TouchableOpacity
                                        onPress={async () => {
                                            try {
                                                if (!user?.email || !oldPassword || !newPassword) {
                                                    Alert.alert('입력 누락', '기존/새 비밀번호를 모두 입력해주세요.');
                                                    return;
                                                }

                                                await reauthenticate(user.email, oldPassword);
                                                await changePassword(newPassword);

                                                setOldPassword('');
                                                setNewPassword('');
                                                setShowPasswordFields(false);

                                                Toast.show('✅ 비밀번호가 변경되었습니다.', {
                                                    duration: Toast.durations.SHORT,
                                                    position: Toast.positions.BOTTOM,
                                                });
                                            } catch (err: any) {
                                                const message = err.code === 'auth/wrong-password'
                                                    ? '기존 비밀번호가 일치하지 않습니다.'
                                                    : err.message || '비밀번호 변경 중 오류가 발생했습니다.';
                                                Alert.alert('변경 실패', message);
                                            }
                                        }}
                                        style={{
                                            backgroundColor: colors.primary,
                                            paddingVertical: spacing.sm,
                                            borderRadius: 8,
                                            alignItems: 'center',
                                            marginBottom: spacing.md,
                                        }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>비밀번호 변경 저장</Text>
                                    </TouchableOpacity>
                                </>
                            )}*/}

                            <Modal visible={showPasswordFields} transparent animationType="fade">
                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <View
                                        style={{
                                            width: '85%',
                                            backgroundColor: colors.surface,
                                            borderRadius: 16,
                                            padding: spacing.lg,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: font.body,
                                                fontWeight: 'bold',
                                                color: colors.text,
                                                marginBottom: spacing.lg,
                                            }}
                                        >
                                            🔒 비밀번호 변경
                                        </Text>

                                        {/* 기존 비밀번호 */}
                                        <View style={{ marginBottom: spacing.md }}>
                                            <Text
                                                style={{
                                                    fontSize: font.caption,
                                                    fontWeight: '600',
                                                    color: colors.subtext,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                기존 비밀번호
                                            </Text>
                                            <TextInput
                                                placeholder="기존 비밀번호"
                                                value={oldPassword}
                                                onChangeText={setOldPassword}
                                                style={{
                                                    borderWidth: 1,
                                                    borderColor: colors.border,
                                                    borderRadius: 10,
                                                    padding: spacing.sm,
                                                    color: colors.text,
                                                    backgroundColor: colors.card,
                                                }}
                                            />
                                        </View>

                                        {/* 새 비밀번호 */}
                                        <View style={{ marginBottom: spacing.md }}>
                                            <Text
                                                style={{
                                                    fontSize: font.caption,
                                                    fontWeight: '600',
                                                    color: colors.subtext,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                새 비밀번호
                                            </Text>
                                            <TextInput
                                                placeholder="새 비밀번호"
                                                value={newPassword}
                                                onChangeText={setNewPassword}
                                                style={{
                                                    borderWidth: 1,
                                                    borderColor: colors.border,
                                                    borderRadius: 10,
                                                    padding: spacing.sm,
                                                    color: colors.text,
                                                    backgroundColor: colors.card,
                                                }}
                                            />
                                        </View>

                                        {/* 저장 버튼 */}
                                        <TouchableOpacity
                                            onPress={async () => {
                                                try {
                                                    if (!user?.email || !oldPassword || !newPassword) {
                                                        Alert.alert('입력 누락', '기존/새 비밀번호를 모두 입력해주세요.');
                                                        return;
                                                    }

                                                    await reauthenticate(user.email, oldPassword);
                                                    await changePassword(newPassword);

                                                    setOldPassword('');
                                                    setNewPassword('');
                                                    setShowPasswordFields(false);

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
                                                }
                                            }}
                                            style={{
                                                backgroundColor: colors.primary,
                                                paddingVertical: spacing.sm,
                                                borderRadius: 8,
                                                alignItems: 'center',
                                                marginBottom: spacing.md,
                                            }}
                                        >
                                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                                비밀번호 변경 저장
                                            </Text>
                                        </TouchableOpacity>

                                        {/* 닫기 */}
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowPasswordFields(false);
                                                setOldPassword('');
                                                setNewPassword('');
                                            }}
                                            style={{ alignItems: 'center' }}
                                        >
                                            <Text style={{ color: colors.subtext }}>닫기</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>

                            {/* 저장 */}
                            <TouchableOpacity
                                onPress={handleSaveProfile}
                                style={{
                                    backgroundColor: colors.primary,
                                    paddingVertical: spacing.md,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    marginBottom: spacing.sm,
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>💾 프로필 저장</Text>
                            </TouchableOpacity>

                            {/* 닫기 */}
                            <TouchableOpacity onPress={() => setShowEditProfile(false)}
                                              style={{
                                                  paddingVertical: spacing.md,
                                                  borderRadius: 12,
                                                  alignItems: 'center',
                                                  marginBottom: spacing.sm,
                                              }}>
                                <Text style={{ color: colors.subtext,fontSize: 15 }}>닫기</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <TouchableOpacity
                    onPress={() => router.push('/setting/joinTeams')}
                    style={{
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: 16,
                        marginBottom: spacing.sm,
                    }}
                >
                    <Text style={{ fontSize: 16, color: colors.text }}>내 모임 관리</Text>
                </TouchableOpacity>

                {/* 🌙 다크모드 */}
                <View
                    style={{
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: 16,
                        marginBottom: spacing.md,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>🌙 다크모드</Text>
                    <ThemeToggle />
                </View>

                {/* 📖 오늘의 말씀 알림 */}
                <View
                    style={{
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: spacing.md,
                        marginBottom: spacing.md,
                    }}
                >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                        📖 오늘의 말씀 알림
                    </Text>
                    <PushSettings />
                </View>

                {/* 📢 공지사항 관리 */}
                <TouchableOpacity
                    onPress={() => router.push('/setting/noticeManager')}
                    style={{
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: 16,
                        marginBottom: spacing.sm,
                    }}
                >
                    <Text style={{ fontSize: 16, color: colors.text }}>📢 공지사항 관리</Text>
                </TouchableOpacity>

                {/*역할 변경*/}
                {user?.role === '새가족' && (
                    <>
                        <TouchableOpacity
                            onPress={() => setShowUpgradeModal(true)}
                            style={{
                                marginTop: 24,
                                backgroundColor: colors.primary,
                                padding: spacing.md,
                                borderRadius: radius.md,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>🙌 정회원이 되었나요?</Text>
                        </TouchableOpacity>

                        <Modal visible={showUpgradeModal} transparent animationType="fade">
                            <View style={{
                                flex: 1,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <View style={{
                                    backgroundColor: colors.surface,
                                    padding: spacing.lg,
                                    borderRadius: radius.lg,
                                    width: '80%',
                                }}>
                                    <Text style={{
                                        fontSize: font.body,
                                        fontWeight: '600',
                                        color: colors.text,
                                        marginBottom: spacing.md,
                                    }}>
                                        교역자나 목회자에게 확인받고 정회원으로 전환해주세요.
                                    </Text>

                                    <TouchableOpacity
                                        onPress={handleUpgrade}
                                        style={{
                                            backgroundColor: colors.primary,
                                            paddingVertical: spacing.md,
                                            borderRadius: radius.md,
                                            alignItems: 'center',
                                            marginBottom: spacing.md,
                                        }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>✅ 정회원 전환</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setShowUpgradeModal(false)}
                                        style={{
                                            alignItems: 'center',
                                            paddingVertical: spacing.sm,
                                        }}
                                    >
                                        <Text style={{ color: colors.subtext }}>취소</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    </>
                )}

                {/* 📝 피드백 */}
                <TouchableOpacity
                    onPress={() => router.push('/setting/feedback')}
                    style={{
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: 16,
                        marginBottom: spacing.sm,
                    }}
                >
                    <Text style={{ fontSize: 16, color: colors.text }}>📝 피드백 보내기</Text>
                </TouchableOpacity>

                {/* 📺 유튜브 영상 관리 (교역자 전용) */}
                {user?.role === '교역자' && (
                    <TouchableOpacity
                        onPress={() => router.push('/setting/videoManager')}
                        style={{
                            backgroundColor: colors.primary,
                            padding: spacing.md,
                            borderRadius: 16,
                            marginBottom: spacing.md,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                            📺 유튜브 영상 관리
                        </Text>
                    </TouchableOpacity>
                )}

                {/* 📱 로그인된 기기 보기 */}
                <View style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    marginVertical: spacing.sm,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 2,
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text }}>📱 로그인된 기기 보기</Text>
                        <TouchableOpacity onPress={() => setModalVisible(true)}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>목록 보기</Text>
                        </TouchableOpacity>
                    </View>
                    <DeviceManager visible={modalVisible} onClose={() => setModalVisible(false)} />
                </View>

                {/* ❌ 회원 탈퇴 */}
                <TouchableOpacity
                    onPress={handleDeleteAccount}
                    style={{
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.error,
                        alignItems: 'center',
                        marginBottom: spacing.md,
                    }}
                >
                    <Text style={{ color: colors.error, fontWeight: 'bold' }}>❌ 회원 탈퇴</Text>
                </TouchableOpacity>

                {/* 🚪 로그아웃 */}
                <TouchableOpacity
                    onPress={handleLogout}
                    style={{
                        backgroundColor: colors.error,
                        padding: spacing.md,
                        borderRadius: 16,
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>로그아웃</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
