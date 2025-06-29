// components/LoadingModal.tsx
import React, { useMemo } from "react";
import { Modal, Text, View } from "react-native";
import LottieView from "lottie-react-native";

interface LoadingModalProps {
    visible: boolean;
    animations: any[]; // JSON 배열
    message?: string;
    subMessage?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({
                                                       visible,
                                                       animations,
                                                       message = "처리 중...",
                                                       subMessage = "잠시만 기다려주세요",
                                                   }) => {
    const randomAnimation = useMemo(() => {
        const randomIndex = Math.floor(Math.random() * animations.length);
        return animations[randomIndex];
    }, [visible]); // visible이 true일 때만 새로 선택

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0,0,0,0.7)",
                }}
            >
                <LottieView
                    source={randomAnimation}
                    autoPlay
                    loop
                    speed={0.8}
                    style={{ width: 400, height: 400 }}
                />
                <View style={{ alignItems: "center" }}>
                    <Text
                        style={{
                            color: "#fff",
                            fontSize: 22,
                            fontWeight: "600",
                            marginTop: 16,
                        }}
                    >
                        {message}
                    </Text>
                    <Text
                        style={{
                            color: "#fff",
                            fontSize: 14,
                            marginTop: 8,
                            opacity: 0.8,
                        }}
                    >
                        {subMessage}
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

export default LoadingModal;
