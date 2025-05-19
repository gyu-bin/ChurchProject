// redux/slices/teamSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchTeamsFromFirestore } from '@/services/teams/teamService';

interface Team {
    id: string;
    name: string;
    leader: string;
    members: string[];
}

interface TeamState {
    list: Team[];
    loading: boolean;
}

const initialState: TeamState = {
    list: [],
    loading: false,
};

export const fetchTeams = createAsyncThunk('teams/fetch', async () => {
    const data = await fetchTeamsFromFirestore();
    return data;
});

const teamSlice = createSlice({
    name: 'teams',
    initialState,
    reducers: {
        clearTeams(state) {
            state.list = [];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTeams.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchTeams.fulfilled, (state, action: PayloadAction<Team[]>) => {
                state.list = action.payload;
                state.loading = false;
            })
            .addCase(fetchTeams.rejected, (state) => {
                state.loading = false;
            });
    },
});

export const { clearTeams } = teamSlice.actions;
export default teamSlice.reducer;
