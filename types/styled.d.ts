// styled.d.ts
import 'styled-components/native';
import { Colors } from '../context/types';

declare module 'styled-components/native' {
    export interface DefaultTheme extends Colors {}
}
