// app/_layout.tsx

import { ThemeProviderCustom } from '@/context/ThemeContext';
import { DesignSystemProvider } from '@/context/DesignSystem';
import RootLayoutInner from './_layout-inner';
import React, { useEffect } from 'react';
import { cleanDuplicateExpoTokens } from '@/services/cleanExpoTokens';

export default function RootLayout() {

    useEffect(() => {
        cleanDuplicateExpoTokens(); // 앱 시작 시 중복 푸시토큰 정리
    }, []);

    return (
        <ThemeProviderCustom>
            <DesignSystemProvider>
                <RootLayoutInner />
            </DesignSystemProvider>
        </ThemeProviderCustom>
    );
}
