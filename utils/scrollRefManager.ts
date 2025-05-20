// utils/scrollRefManager.ts
type ScrollCallback = () => void;
const scrollRefMap = new Map<string, ScrollCallback>();

export const setScrollCallback = (key: string, cb: ScrollCallback) => {
    scrollRefMap.set(key, cb);
};

export const getScrollCallback = (key: string): ScrollCallback | undefined => {
    return scrollRefMap.get(key);
};
