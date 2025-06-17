import { db } from '@/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
// import { sendNotification, sendPushNotification } from '@/services/notificationService';
import { useDesign } from '@/app/context/DesignSystem';
import { sendPushNotification } from "@/services/notificationService";
import { showToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { useAppTheme } from '@/context/ThemeContext';

export default function CreateTeam() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [leader, setLeader] = useState('');
    const [creatorEmail, setCreatorEmail] = useState('');
    const [isUnlimited, setIsUnlimited] = useState(false); // ✅ 무제한 상태
    const [role, setRole] = useState('');
    const [memberCount, setMemberCount] = useState('');
    const [category, setCategory] = useState('');
    const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
    const [isSparkleModalVisible, setSparkleModalVisible] = useState(false);
    const [expirationDate, setExpirationDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, spacing, radius, font } = useDesign();

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

    useEffect(() => {
        AsyncStorage.getItem('currentUser').then((raw) => {
            if (raw) {
                const user = JSON.parse(raw);
                setLeader(user.name);
                setCreatorEmail(user.email);
                setRole(user.role);
            }
        });
    }, []);

    const handleSubmit = async () => {
        if (!name) {
            Alert.alert('입력 오류', '모임명을 입력해주세요.');
            return;
        }

        if (role === '새가족') {
            Alert.alert('권한 부족', '정회원 또는 교역자만 소모임을 생성할 수 있습니다.');
            return;
        }

        let max: number|null = null;
        if (!isUnlimited) {
            max = parseInt(memberCount);
            if (isNaN(max) || max < 2 || max > 99) {
                Alert.alert('입력 오류', '참여 인원 수는 2명 이상 99명 이하로 설정해주세요.');
                return;
            }
        } else {
            max = -1;
        }

        try {
            const baseData = {
                name,
                leader,
                leaderEmail: creatorEmail,
                description,
                membersList: [creatorEmail],
                createdAt: new Date(),
                maxMembers: max,
                category,
                ...(category === '✨ 반짝소모임' && expirationDate && { expirationDate }),
            };

            const teamRef = await addDoc(collection(db, 'teams'), {
                ...baseData,
                approved: true,
                id: '',
                teamId: '',
            });

            await updateDoc(teamRef, {
                id: teamRef.id,
                teamId: teamRef.id,
            });

            // ✅ '✨ 반짝소모임'일 경우: 삭제 예약 + 푸시 알림
            if (category === '✨ 반짝소모임' && expirationDate) {
                // 🔹 삭제 예약
                const deletionDate = new Date(expirationDate);
                deletionDate.setDate(deletionDate.getDate() + 1);
                const timeUntilDeletion = deletionDate.getTime() - new Date().getTime();

                setTimeout(async () => {
                    try {
                        await deleteDoc(doc(db, 'teams', teamRef.id));
                        console.log('✅ 반짝소모임 자동 삭제 완료');
                    } catch (e) {
                        console.error('❌ 삭제 실패:', e);
                    }
                }, timeUntilDeletion);

                // 🔹 푸시 알림: 모든 Expo 토큰 대상, 중복 방지
                try {
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

                                pushPromises.push(sendPushNotification({
                                    to: token,
                                    title: '✨ 반짝소모임 생성!',
                                    body: `${leader}님의 반짝소모임 "${name}"에 참여해보세요!`,
                                }));
                            }
                        });
                    });

                    await Promise.all(pushPromises);
                    console.log(`✅ ${sentTokens.size}개의 Expo 푸시 전송 완료`);

                } catch (err) {
                    console.error('❌ 푸시 알림 실패:', err);
                }
            }

            showToast('✅ 모임이 성공적으로 생성되었습니다.');
            router.replace('/teams');

        } catch (error: any) {
            Alert.alert('생성 실패', error.message);
        }
    };

    const handleCategorySelect = (cat: { label: string; value: string }) => {
        setCategory(cat.label);
        setCategoryModalVisible(false);
        if (cat.value === '반짝소모임') {
            setSparkleModalVisible(true);
        }
    };

    const handleDateChange = (event: any, selectedDate: Date | undefined) => {
        const currentDate = selectedDate || expirationDate;
        setShowDatePicker(Platform.OS === 'ios');
        setExpirationDate(currentDate);
    };


    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background,paddingTop: Platform.OS === 'android' ? insets.top : 20 }}>
            {/* 상단 화살표 + 소모임생성 한 줄 */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingTop: 20,
                    paddingHorizontal: spacing.lg,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        paddingLeft: 8,
                        zIndex: 1,
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: font.heading, fontWeight: 'bold', color: colors.text, textAlign: 'center' }}>
                    소모임 생성
                </Text>
            </View>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
                    <TextInput
                        placeholder="모임명 (예: 러닝크루)"
                        placeholderTextColor={colors.placeholder}
                        value={name}
                        onChangeText={setName}
                        style={{
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            marginBottom: spacing.md,
                            color: colors.text,
                            fontSize: font.body,
                        }}
                    />

                    <TextInput
                        placeholder="모임 소개 (선택 사항)"
                        placeholderTextColor={colors.placeholder}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        style={{
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            marginBottom: spacing.md,
                            height: 120,
                            color: colors.text,
                            fontSize: font.body,
                            textAlignVertical: 'top',
                        }}
                    />

                    {/* 최대 인원수 + 무제한 체크박스 */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                        <TextInput
                            placeholder="최대 인원 수 (예: 5)"
                            keyboardType="numeric"
                            value={isUnlimited ? '무제한' : memberCount}
                            onChangeText={setMemberCount}
                            placeholderTextColor={colors.placeholder}
                            editable={!isUnlimited}
                            style={{
                                flex: 1,
                                backgroundColor: colors.surface,
                                padding: spacing.md,
                                borderRadius: radius.md,
                                borderWidth: 1,
                                borderColor: colors.border,
                                color: colors.text,
                                fontSize: font.body,
                                opacity: isUnlimited ? 0.5 : 1,
                                marginRight: 12,
                            }}
                        />
                        <TouchableOpacity
                            onPress={() => setIsUnlimited(prev => !prev)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                borderRadius: 8,
                                backgroundColor: isUnlimited ? colors.primary + '15' : 'transparent',
                            }}
                        >
                            <Ionicons
                                name={isUnlimited ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={isUnlimited ? colors.primary : colors.subtext}
                            />
                            <Text style={{
                                color: colors.text,
                                marginLeft: 6,
                                fontSize: font.body
                            }}>
                                무제한
                            </Text>
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
                        <Text style={{ color: colors.text, fontSize: font.body }}>
                            {category ? `카테고리: ${category}` : '카테고리를 선택하세요'}
                        </Text>
                    </TouchableOpacity>

                    <Modal
                        visible={isCategoryModalVisible}
                        transparent
                        animationType="slide"
                    >
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <View style={{ width: '80%', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md }}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    {categories.map(cat => (
                                        <TouchableOpacity
                                            key={cat.value}
                                            onPress={() => handleCategorySelect(cat)}
                                            style={{
                                                width: '30%',
                                                margin: 5,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ fontSize: 30, marginBottom: 5 }}>{cat.label.split(' ')[0]}</Text>
                                            <Text style={{ color: colors.text, fontSize: font.body }}>{cat.label.split(' ')[1]}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={{ marginTop: spacing.md }}>
                                    <Text style={{ color: colors.primary, textAlign: 'center', fontSize: font.body }}>닫기</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    {/* 날짜 선택 (반짝소모임일 때만) */}
                    {category === '✨ 반짝소모임' && (
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            marginBottom: spacing.md,
                        }}>
                            <Text style={{ color: colors.text, fontSize: font.body }}>
                                {`날짜 선택: ${expirationDate.toLocaleDateString()}`}
                            </Text>
                            <Text style={{ color: colors.text, fontSize: font.caption }}>
                                {'선택한 날짜 다음날 모임이 삭제됩니다.'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {showDatePicker && category === '✨ 반짝소모임' && (
                        <DateTimePicker
                            value={expirationDate}
                            mode='date'
                            display='default'
                            onChange={handleDateChange}
                        />
                    )}

                    <Modal
                        visible={isSparkleModalVisible}
                        transparent
                        animationType="slide"
                    >
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <View style={{ width: '80%', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md }}>
                                <Text style={{ color: colors.text, fontSize: font.body, marginBottom: spacing.md }}>
                                    반짝 소모임은 선택한 날짜 다음날 모임이 삭제되는 번개모임입니다. 반짝 소모임 생성 시 모든 회원에게 알림이 갑니다.
                                </Text>

                                <TouchableOpacity onPress={() => setSparkleModalVisible(false)}>
                                    <Text style={{ color: colors.primary, textAlign: 'center', fontSize: font.body }}>
                                        확인
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={{
                            backgroundColor: colors.primary,
                            paddingVertical: spacing.md,
                            borderRadius: radius.md,
                            alignItems: 'center',
                            marginTop: spacing.sm,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: font.body, fontWeight: 'bold' }}>소모임 생성</Text>
                    </TouchableOpacity>

                    <Text style={{
                        fontSize: Platform.OS === 'android' ? 12 : 14,
                        color: colors.subtext,
                        textAlign: 'center',
                        marginTop: spacing.lg,
                        lineHeight: 20,
                        fontWeight: 'bold'
                    }}>
                        ※ 소모임은 정회원 또는 교역자만 생성할 수 있습니다.{'\n'}
                        ※ 모임장은 정회원 이상이어야 하며, 최소 5명 이상이 모여야 합니다.{'\n'}
                        ※ 생성 후 1개월 내 인원이 없을 경우 모임이 삭제될 수 있습니다.{'\n'}
                        ※ 교회와 무관한 주제의 모임은 임의로 삭제될 수 있습니다.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
