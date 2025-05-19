// redux/index.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../slices/userSlice';
import prayerReducer from '../slices/prayerSlice';
import teamReducer from '../slices/teamSlice';

export const store = configureStore({
    reducer: {
        user: userReducer,
        prayers: prayerReducer,
        teams: teamReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
