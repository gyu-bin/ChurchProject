export const formatFirebaseTimestamp = (timestamp: any): string => {
  if (!timestamp) return "방금 전";

  try {
    // Convert Firestore Timestamp to Date
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "방금 전";
  }
};
