import * as admin from 'firebase-admin';
import { sendWeeklyDevotionRanking } from './scheduledFunctions';

admin.initializeApp();

export {
    sendWeeklyDevotionRanking
};
