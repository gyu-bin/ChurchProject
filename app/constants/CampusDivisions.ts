export type Campus = "SINCHON" | "MULLAE" | "SEESUN";

export const ALL_CAMPUS = "ALL";
export type AllCampus = typeof ALL_CAMPUS;

export const CAMPUS_ENUM: Record<CampusWithAll, string> = {
  ALL: "전체",
  SINCHON: "신촌캠퍼스",
  MULLAE: "문래캠퍼스",
  SEESUN: "시선교회",
};

export const CAMPUS_WITH_ALL: CampusWithAll[] = [
  ...(Object.keys(CAMPUS_ENUM) as CampusWithAll[]),
];
export type CampusWithAll = Campus | AllCampus;

export type Department =
  | "PRE_SCHOOL"
  | "ELEMENTARY_SCHOOL"
  | "MIDDLE_SCHOOL"
  | "YOUNG_1"
  | "YOUNG_2"
  | "ADULT";

export const ALL_DEPARTMENT = "ALL";
export type AllDepartment = typeof ALL_DEPARTMENT;

export const DEPARTMENT_ENUM: Record<DepartmentWithAll, string> = {
  ALL: "전체",
  PRE_SCHOOL: "유치부",
  ELEMENTARY_SCHOOL: "초등부",
  MIDDLE_SCHOOL: "중고등부",
  YOUNG_1: "청년1부",
  YOUNG_2: "청년2부",
  ADULT: "장년부",
};

export const DEPARTMENT_WITH_ALL: DepartmentWithAll[] = [
  ...(Object.keys(DEPARTMENT_ENUM) as Department[]),
];

export type DepartmentWithAll = Department | AllDepartment;

// TODO 추후 사용, 일단은 전부 다 있다고 가정
export const CAMPUS_DIVISIONS: Record<Campus, DepartmentWithAll[]> = {
  SINCHON: [
    "PRE_SCHOOL",
    "ELEMENTARY_SCHOOL",
    "MIDDLE_SCHOOL",
    "YOUNG_1",
    "YOUNG_2",
    "ADULT",
  ],
  MULLAE: [
    "PRE_SCHOOL",
    "ELEMENTARY_SCHOOL",
    "MIDDLE_SCHOOL",
    "YOUNG_1",
    "YOUNG_2",
    "ADULT",
  ],
  SEESUN: [
    "PRE_SCHOOL",
    "ELEMENTARY_SCHOOL",
    "MIDDLE_SCHOOL",
    "YOUNG_1",
    "YOUNG_2",
    "ADULT",
  ],
};
