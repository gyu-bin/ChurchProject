//redux/store/reducers.ts
import { combineReducers } from "redux";
import prayerReducer from "@/redux/slices/prayerSlice";
import teamReducer from "@/redux/slices/teamSlice";
import userReducer from "@/redux/slices/userSlice";
import scrollRefReducer from "../slices/scrollRefSlice"; // ✅ 상대경로로 유지

const rootReducer = combineReducers({
    prayers: prayerReducer,
    teams: teamReducer,
    user: userReducer,
    scrollRef: scrollRefReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
