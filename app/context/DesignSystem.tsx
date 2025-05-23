export type Colors = {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    subtext: string;
    border: string;
    card: string;
    error: string;
    placeholder: string;
    success: string;
    warning: string;
};

export type Font = {
    heading: number;
    body: number;
    caption: number;
    title: number;
};

export const font: Font = {
    heading: 20,
    body: 16,
    caption: 14,
    title: 18,
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const radius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
}; 