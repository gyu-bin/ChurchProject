// // services/sendPushNotification.ts
// export async function sendPushNotification({
//                                                to,
//                                                title,
//                                                body,
//                                            }: {
//     to: string;
//     title: string;
//     body: string;
// }) {
//     await fetch('https://exp.host/--/api/v2/push/send', {
//         method: 'POST',
//         headers: {
//             Accept: 'application/json',
//             'Accept-encoding': 'gzip, deflate',
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//             to,
//             sound: 'default',
//             title,
//             body,
//         }),
//     });
// }
