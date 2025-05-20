// redux/slices/scrollRefSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ScrollMap = Record<string, () => void>;

interface ScrollRefState {
    refMap: ScrollMap;
}

const initialState: ScrollRefState = { refMap: {} };

const scrollRefSlice = createSlice({
    name: 'scrollRef',
    initialState,
    reducers: {
        setScrollRef: (
            state,
            action: PayloadAction<{ key: string; callback: () => void }>
        ) => {
            state.refMap[action.payload.key] = action.payload.callback;
        },
    },
});

export const { setScrollRef } = scrollRefSlice.actions;
export default scrollRefSlice.reducer;
