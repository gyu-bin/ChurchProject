type Campus = "문래" | "신촌" | "시선";
type Division = "청년1부" | "청년2부" | "장년부";
type Role = "관리자" | "정회원" | "교역자";

// API return 값 타입
export type DangerousUser = {
  campus: Campus;
  createdAt: {
    nanoseconds: number;
    seconds: number;
  };
  division: Division;
  email: string;
  expoPushTokens: string[];
  name: string;
  password: string; // 이거 여기 있어도 되는가?
  role: Role;
};

export type User = Omit<DangerousUser, "password">;
