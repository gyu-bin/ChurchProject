// styled.d.ts
import 'styled-components/native';
import { Colors, Font, Radius, Spacing } from '../context/types';

declare module 'styled-components/native' {
  export interface DefaultTheme {
    colors: Colors;
    font: Font;
    radius: Radius;
    spacing: Spacing;
  }
}
