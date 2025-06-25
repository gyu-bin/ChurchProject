// styled.d.ts
import 'styled-components';

declare module 'styled-components' {
    export interface DefaultTheme {
        colors: {
            background: string;
            text: string;
            surface: string;
            primary: string;
            [key: string]: string;
        };
        spacing: {
            sm: number;
            md: number;
            lg: number;
        };
        radius: {
            sm: number;
            md: number;
            lg: number;
        };
    }
}
