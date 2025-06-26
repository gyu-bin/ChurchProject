// styled.d.ts
import 'styled-components';
import { UseDesignReturnType } from '@/context/DesignSystem';

declare module 'styled-components' {
    export interface DefaultTheme extends UseDesignReturnType {}
}
