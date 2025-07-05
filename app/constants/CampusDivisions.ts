export type Campus = "SINCHON" | "MULLAE" | "SEESUN";

export const ALL_CAMPUS = "ALL";
export type AllCampus = typeof ALL_CAMPUS;

export const CAMPUS_WITH_ALL = [ALL_CAMPUS, ...Object.values(CAMPUS_ENUM)];
export type CampusWithAll = Campus | AllCampus;

export const CAMPUS_ENUM: Record<CampusWithAll, string> = {
  ALL: "전체",
  SINCHON: "신촌캠퍼스",
  MULLAE: "문래캠퍼스",
  SEESUN: "시선교회",
};

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

export const DEPARTMENT_WITH_ALL = [
  ALL_DEPARTMENT,
  ...Object.values(DEPARTMENT_ENUM),
];
export type DepartmentWithAll = Department | AllDepartment;

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
