import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    fetchPrayersFromFirestore,
    addPrayer,
    deletePrayer,
} from '@/services/prayers/prayerService';
import { Prayer } from '@/types/prayer';

interface PrayerState {
    list: Prayer[];
    loading: boolean;
}

const initialState: PrayerState = {
    list: [],
    loading: false,
};

export const fetchPrayers = createAsyncThunk('prayers/fetch', async () => {
    const data = await fetchPrayersFromFirestore();
    return data;
});

export const addNewPrayer = createAsyncThunk(
    'prayers/add',
    async (payload: { title: string; content: string; author: string }) => {
        const newPrayer = await addPrayer(payload);
        return newPrayer;
    }
);

export const removePrayer = createAsyncThunk(
    'prayers/remove',
    async (id: string) => {
        await deletePrayer(id);
        return id;
    }
);

const prayerSlice = createSlice({
    name: 'prayers',
    initialState,
    reducers: {
        clearPrayers(state) {
            state.list = [];
        },
        setPrayers(state, action: PayloadAction<Prayer[]>) {
            state.list = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPrayers.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchPrayers.fulfilled, (state, action: PayloadAction<Prayer[]>) => {
                state.list = action.payload;
                state.loading = false;
            })
            .addCase(fetchPrayers.rejected, (state) => {
                state.loading = false;
            })
            .addCase(addNewPrayer.fulfilled, (state, action: PayloadAction<Prayer>) => {
                state.list.unshift(action.payload);
            })
            .addCase(removePrayer.fulfilled, (state, action: PayloadAction<string>) => {
                state.list = state.list.filter((p) => p.id !== action.payload);
            });
    },
});

export const { clearPrayers, setPrayers } = prayerSlice.actions;
export default prayerSlice.reducer;
