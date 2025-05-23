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

export type ThemeContextType = {
    colors: Colors;
    mode: 'light' | 'dark';
    toggleTheme: () => void;
}; 