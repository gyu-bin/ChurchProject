// app/_layout.tsx

import { ThemeProviderCustom } from '@/context/ThemeContext';
import { DesignSystemProvider } from '@/context/DesignSystem';
import RootLayoutInner from './_layout-inner';

export default function RootLayout() {
    return (
        <ThemeProviderCustom>
            <DesignSystemProvider>
                <RootLayoutInner />
            </DesignSystemProvider>
        </ThemeProviderCustom>
    );
}
