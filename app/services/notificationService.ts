// Define the notification types as a const array first
export const NOTIFICATION_TYPES = [
    'team_join_request',
    'team_join_approved',
    'team_join_rejected',
    'schedule_update',
    'chat_message'
] as const;  // Make it readonly

// Then create the type from the array values
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationData = {
    to: string;
    message: string;
    type: NotificationType;
    link?: string;
    tab?: string;
    teamId?: string;
    teamName?: string;
    applicantEmail?: string;
    applicantName?: string;
    scheduleDate?: string;
};

export async function sendNotification(data: NotificationData) {
    // ... existing implementation ...
}

export async function sendPushNotification(data: { to: string[] | string; title: string; body: string }) {
    // ... existing implementation ...
} 