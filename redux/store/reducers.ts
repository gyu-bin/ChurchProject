import { combineReducers } from "redux";
import prayerReducer from "@/redux/slices/prayerSlice";
import teamReducer from "@/redux/slices/teamSlice";
import userReducer from "@/redux/slices/userSlice";

const rootReducer = combineReducers({
    prayers: prayerReducer,
    teams: teamReducer,
    user: userReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
