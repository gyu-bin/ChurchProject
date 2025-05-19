// redux/slices/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getUserData } from '@/services/user/userService';

interface UserState {
    uid: string;
    name: string;
    campus: string;
    division: string;
    role: string;
    loading: boolean;
}

const initialState: UserState = {
    uid: '',
    name: '',
    campus: '',
    division: '',
    role: '',
    loading: false,
};


export const fetchUserData = createAsyncThunk(
    'user/fetchUserData',
    async (uid: string) => {
        const data = await getUserData(uid);
        return data;
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        logoutUser: () => initialState,
        setUserInfo: (state, action: PayloadAction<Partial<UserState>>) => {
            return { ...state, ...action.payload };
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserData.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchUserData.fulfilled, (state, action: PayloadAction<any>) => {
                state.loading = false;
                Object.assign(state, action.payload);
            })
            .addCase(fetchUserData.rejected, (state) => {
                state.loading = false;
            });
    },
});

export const { logoutUser, setUserInfo } = userSlice.actions;
export default userSlice.reducer;
