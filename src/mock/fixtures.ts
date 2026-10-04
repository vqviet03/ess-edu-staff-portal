import {
  skillCodes,
  type Assessment,
  type AuthSession,
  type Class,
  type Session,
  type Student,
  type StudentResult,
  type ImportPreview,
} from "@/types";
import { managementSeed, type ManagementDatabase } from "./management-fixtures";
import { emptyResult } from "@/utils/scores";
export interface Database {
  management?: ManagementDatabase;
  classes: Class[];
  students: Record<string, Student[]>;
  sessions: Session[];
  assessments: Assessment[];
  results: Record<string, StudentResult[]>;
  tokens: Record<string, AuthSession>;
  usedCodes: string[];
  previews: Record<
    string,
    { preview: ImportPreview; assessmentId: string; schemaVersion: number }
  >;
  commits: Record<string, { previewId: string; mode: string; data: unknown }>;
}
export function seed(): Database {
  const classes: Class[] = [
    {
      id: "class-green",
      code: "JNR03",
      name: "Juniors 03",
      schedule: "Thứ 3, 5 · 18:00–19:30",
      status: "ACTIVE",
      studentCount: 8,
      totalUnits: 8,
      completedUnits: 2,
    },
    {
      id: "class-sun",
      code: "JNR02",
      name: "Juniors 02",
      schedule: "Thứ 2, 6 · 17:30–19:00",
      status: "COMPLETED",
      studentCount: 6,
      totalUnits: 3,
      completedUnits: 3,
    },
    {
      id: "class-sky",
      code: "KID01",
      name: "Kids 01",
      schedule: "Thứ 7 · 09:00–10:30",
      status: "PAUSED",
      studentCount: 5,
      totalUnits: 6,
      completedUnits: 0,
    },
  ];
  const names = [
    "Hữu Văn",
    "Minh Anh",
    "Hoàng Nam",
    "Ngọc Linh",
    "Gia Hân",
    "Đức Minh",
    "Khánh An",
    "Bảo Ngọc",
  ];
  const students = Object.fromEntries(
    classes.map((c, k) => [
      c.id,
      Array.from({ length: c.studentCount }, (_, i) => ({
        id: `HV${k + 1}${String(i + 1).padStart(3, "0")}`,
        name: names[i],
        nickname: ["Bon", "Anna", "Ben", "Lily", "Han", "Min", "An", "Bee"][i],
        dateOfBirth: `2016-${String(i + 1).padStart(2, "0")}-12`,
        status: "ACTIVE" as const,
        version: 1,
      })),
    ]),
  );
  const sessions: Session[] = [
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `session-${i + 1}`,
      classId: "class-green",
      name: `Unit ${i + 1}`,
      unitNumber: i + 1,
      date: `2026-09-${10 + i * 5}`,
      note: i === 2 ? "Luyện tập và đánh giá cuối Unit." : "",
      status: i < 2 ? ("COMPLETED" as const) : ("DRAFT" as const),
      version: 1,
    })),
    {
      id: "session-review",
      classId: "class-green",
      name: "Ôn tập Unit 2",
      unitNumber: 2,
      date: "2026-09-22",
      note: "Phiên cùng Unit không tăng trùng tiến độ.",
      status: "COMPLETED",
      version: 1,
    },
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `sun-${i + 1}`,
      classId: "class-sun",
      name: `Unit ${i + 1}`,
      unitNumber: i + 1,
      date: "2026-08-12",
      note: "",
      status: "COMPLETED" as const,
      version: 1,
    })),
  ];
  const maxima = [4, 3, 3, 11, 5, 4, 5];
  const assessments: Assessment[] = [
    {
      id: "assessment-seven",
      sessionId: "session-3",
      name: "Theo dõi tiến bộ Unit 3",
      type: "PROGRESS_TRACKING",
      status: "DRAFT",
      schemaVersion: 1,
      version: 1,
      skills: skillCodes.map((s, i) => ({
        skillCode: s,
        maxQuestions: maxima[i],
        allowDecimal: s === "SPEAKING",
        order: i + 1,
      })),
    },
    {
      id: "assessment-two",
      sessionId: "session-3",
      name: "Kiểm tra Nghe & Nói",
      type: "FINAL_TEST",
      status: "DRAFT",
      schemaVersion: 1,
      version: 1,
      skills: [
        {
          skillCode: "LISTENING",
          maxQuestions: 10,
          allowDecimal: false,
          order: 1,
        },
        {
          skillCode: "SPEAKING",
          maxQuestions: 4,
          allowDecimal: true,
          order: 2,
        },
      ],
    },
  ];
  const results: Database["results"] = {};
  for (const a of assessments) {
    results[a.id] = students["class-green"].map((s) =>
      emptyResult(s.id, a.skills),
    );
  }
  const bon = results["assessment-seven"][0];
  bon.attendance = "PRESENT";
  bon.version = 1;
  bon.skillResults.forEach((s, i) => {
    s.score = [1, 3, 2, 10, 4, 2.1, 1][i];
    s.comment = [
      "Cần ôn từ vựng theo chủ đề.",
      "Nắm vững cấu trúc.",
      "Luyện âm cuối.",
      "Nghe hiểu tốt.",
      "Đọc hiểu tốt.",
      "Luyện nói tự tin hơn.",
      "Cần luyện viết câu.",
    ][i];
    s.advice = "Ôn tập thường xuyên, mỗi ngày 10 phút.";
  });
  bon.overallComment =
    "Điểm mạnh: ngữ pháp và nghe.\nCần tập trung thêm vào từ vựng và viết.";
  bon.overallAdvice = "Ôn từ theo chủ đề.\nLuyện viết và nói hằng ngày.";
  return {
    classes,
    students,
    sessions,
    assessments,
    results,
    tokens: {},
    usedCodes: [],
    previews: {},
    commits: {},
  };
}

// Empty-group fixture keeps a manager available while no students exist.
export function seedEmptyStudents(): Database {
  const db = seed();
  for (const id of Object.keys(db.students)) db.students[id] = [];
  db.management = managementSeed(db);
  db.management.students = [];
  db.management.enrollments = [];
  for (const id of Object.keys(db.results)) db.results[id] = [];
  db.classes = db.classes.map((c) => ({ ...c, studentCount: 0 }));
  return db;
}
