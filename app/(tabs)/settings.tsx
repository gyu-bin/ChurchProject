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
import {getAuth} from "firebase/auth";
import {signInWithEmailAndPassword, updatePassword} from "@react-native-firebase/auth";
import {changePassword, reauthenticate} from "@/services/authService";
import NotificationModal from "@/components/NotificationModal";

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

    const [showDevices, setShowDevices] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editValues, setEditValues] = useState<Record<string, string>>({});

    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
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
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: 40, paddingHorizontal: horizontalMargin }} showsVerticalScrollIndicator={false}>

                    <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg }}>⚙️ 설정</Text>

                    {user && (
                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, shadowColor: isDark ? 'transparent' : '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>🙋 내 정보</Text>
                                <TouchableOpacity onPress={handleEditToggle}>
                                    <Text style={{ color: colors.primary,fontSize: 16, fontWeight: '700'}}>✏️ 수정</Text>
                                </TouchableOpacity>
                            </View>

                            {[
                                { label: '이름', value: user.name, key: 'name' },
                                { label: '이메일', value: user.email, key: 'email' },
                                { label: '부서', value: user.division, key: 'division' },
                                { label: '캠퍼스', value: user.campus, key: 'campus' },
                                { label: '역할', value: user.role, key: 'role' },
                            ].map((item, idx) => (
                                <View key={idx} style={{ marginTop: 8 }}>
                                    <View style={{ flexDirection: 'row' }}>
                                        <Text style={{ fontWeight: '600', color: colors.subtext, width: 70 }}>{item.label}</Text>
                                        {showEditProfile ? (
                                            <TextInput
                                                placeholder={`${item.label} 수정`}
                                                value={editValues[item.key] ?? ''}
                                                onChangeText={(text) =>
                                                    setEditValues((prev) => ({ ...prev, [item.key]: text }))
                                                }
                                                style={{
                                                    flex: 1,
                                                    borderWidth: 1,
                                                    borderColor: colors.border,
                                                    borderRadius: 8,
                                                    padding: 8,
                                                    color: colors.text,
                                                }}
                                            />
                                        ) : (
                                            <Text style={{ color: colors.text }}>{item.value}</Text>
                                        )}
                                    </View>
                                </View>
                            ))}

                            {showEditProfile && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setPasswordStage('verify');
                                        setOldPassword('');
                                        setNewPassword('');
                                        setPasswordModalVisible(true);
                                    }}
                                    style={{
                                        backgroundColor: colors.border,
                                        padding: spacing.sm,
                                        borderRadius: radius.md,
                                        alignItems: 'center',
                                        marginTop: spacing.sm,
                                    }}
                                >
                                    <Text style={{ color: colors.text,fontSize: 18,}}>🔒 비밀번호 변경</Text>
                                </TouchableOpacity>
                            )}
                            {/* 🔐 비밀번호 변경 모달 */}
                            <Modal visible={passwordModalVisible} transparent animationType="fade">
                                <View style={{
                                    flex: 1,
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <View style={{
                                        width: '85%',
                                        backgroundColor: colors.surface,
                                        borderRadius: radius.lg,
                                        padding: spacing.lg,
                                    }}>
                                        <Text style={{ fontSize: font.body, fontWeight: '600', marginBottom: spacing.md, color: colors.text }}>
                                            {passwordStage === 'verify' ? '🔑 기존 비밀번호 확인' : '🆕 새 비밀번호 입력'}
                                        </Text>

                                        <TextInput
                                            placeholder={passwordStage === 'verify' ? '기존 비밀번호 입력' : '새 비밀번호 입력'}
                                            secureTextEntry
                                            value={passwordStage === 'verify' ? oldPassword : newPassword}
                                            onChangeText={passwordStage === 'verify' ? setOldPassword : setNewPassword}
                                            style={{
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                borderRadius: 8,
                                                padding: 10,
                                                color: colors.text,
                                                marginBottom: spacing.md,
                                            }}
                                        />

                                        <TouchableOpacity
                                            style={{
                                                backgroundColor: colors.primary,
                                                paddingVertical: spacing.sm,
                                                borderRadius: radius.md,
                                                alignItems: 'center',
                                            }}
                                            onPress={async () => {
                                                try {
                                                    const email = user?.email;
                                                    if (!email) return;

                                                    if (passwordStage === 'verify') {
                                                        await reauthenticate(email, oldPassword);
                                                        setPasswordStage('new');
                                                        setOldPassword('');
                                                    } else {
                                                        await changePassword(newPassword);
                                                        setPasswordModalVisible(false);
                                                        setPasswordStage('verify');
                                                        setNewPassword('');
                                                        Toast.show('✅ 비밀번호가 변경되었습니다.', {
                                                            duration: Toast.durations.SHORT,
                                                            position: Toast.positions.BOTTOM,
                                                        });
                                                    }
                                                } catch (err: any) {
                                                    Alert.alert('오류', err.message || '다시 시도해주세요.');
                                                }
                                            }}
                                        >
                                            <Text style={{ color: '#fff', fontWeight: 'bold',fontSize: 20}}>
                                                {passwordStage === 'verify' ? '확인' : '저장'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                setPasswordModalVisible(false);
                                                setPasswordStage('verify');
                                                setOldPassword('');
                                                setNewPassword('');
                                            }}
                                            style={{ marginTop: spacing.sm, alignItems: 'center' }}
                                        >
                                            <Text style={{ color: colors.subtext, fontSize: 20}}>닫기</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>


                            {showEditProfile && (
                                <TouchableOpacity onPress={handleSaveProfile} style={{ backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>💾 저장</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}


                    <View style={{ backgroundColor: colors.card, paddingVertical: 20, paddingHorizontal: 16, borderRadius: 12, marginVertical: spacing.md, alignSelf: 'stretch', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text }}>🌓 다크모드 전환</Text>
                        <ThemeToggle />
                    </View>

                    {/*말씀 알림*/}
                    <PushSettings />

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

                    <TouchableOpacity
                        onPress={() => router.push('/setting/feedback')}
                        style={{
                            backgroundColor: colors.surface,
                            borderRadius: radius.md,
                            padding: spacing.md,
                            marginTop: spacing.md,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 6,
                            elevation: 2,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text }}>
                            📝 피드백 보내기
                        </Text>
                    </TouchableOpacity>

                    {user?.role === '교역자' && (
                        <TouchableOpacity onPress={() => router.push('/setting/videoManager')} style={{ backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>📺 홈화면 유튜브 영상 관리</Text>
                        </TouchableOpacity>
                    )}

                    {/* 🔔 알림 설정 */}
                    {/*<View style={{
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
                            <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text }}>🔔 알림 설정</Text>
                            <TouchableOpacity onPress={() => setNotificationModalVisible(true)}>
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>설정</Text>
                            </TouchableOpacity>
                        </View>
                        <NotificationModal
                            visible={notificationModalVisible}
                            onClose={() => setNotificationModalVisible(false)}
                        />
                    </View>*/}

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

                    {/* ❌ 계정 탈퇴 */}
                    <View style={{
                        backgroundColor: colors.surface,
                        borderRadius: radius.lg,
                        padding: spacing.md,
                        marginTop: spacing.md,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 6,
                        elevation: 2,
                    }}>
                        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>
                            ❌ 계정 탈퇴
                        </Text>
                        <TouchableOpacity
                            onPress={handleDeleteAccount}
                            style={{
                                backgroundColor: colors.error,
                                paddingVertical: spacing.sm,
                                borderRadius: radius.md,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>계정 탈퇴하기</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: colors.error, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.lg }}>
                        <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>로그아웃</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
