"use client";
import dynamic from "next/dynamic";
const ClassRewardActions = dynamic(() =>
  import("@/features/rewards/class-actions").then((m) => m.ClassRewardActions),
);
const StudentRewards = dynamic(
  () => import("@/features/rewards/detail").then((m) => m.StudentRewards),
  { loading: () => <Feedback loading /> },
);
import { ClassThreadFeed } from "@/features/materials/feed";
import { useClassCapabilities } from "@/features/access/hooks";
import { publicId } from "@/shared/public-id";
import { vietnamToday } from "@/features/rewards/models";
import { useState } from "react";
import {
  ClassDetailTabs,
  initialClassTab,
  type ClassTab,
} from "@/features/classes/detail-tabs";
import { ClassProgress } from "@/features/classes/progress";
import { ClassStudentTable } from "@/features/students/class-table";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  useManagementDetailQuery,
  useManagementListQuery,
  usePreviewAssignmentMutation,
  usePreviewEnrollmentMutation,
  useActivationMutation,
} from "@/api/management-api";
import { errorMessage } from "@/api/base-query";
import { Card, Feedback, NavButton, Progress, Title } from "@/shared/ui";
import { confirmLeave, useUnsaved } from "@/shared/unsaved";
import type {
  BulkPreview,
  Entity,
  TeacherClassAssignment,
  ProfileDetail,
  Enrollment,
  ManagedStudent,
} from "./models";
import { recordName } from "./models";
import { EntityEditor } from "./editor";
import { entityLabels, ManagerOnly, PreviewPanel, showValue } from "./shared";
import { fieldNames } from "./validation";
import { AccountSessions } from "./account-sessions";
import { EnrollmentDatesEditor } from "./enrollment-dates-editor";
const AttendancePanel = dynamic(
  () =>
    import("@/features/attendance/class-panel").then(
      (m) => m.ClassAttendancePanel,
    ),
  { loading: () => <Feedback loading /> },
);
function RelationshipEditor({
  kind,
  classId,
  assignment,
  enrollment,
  close,
}: {
  kind: "assignment" | "enrollment";
  classId: string;
  assignment?: TeacherClassAssignment;
  enrollment?: Enrollment;
  close: (saved?: number) => void;
}) {
  const [personId, setPersonId] = useState(
      assignment?.teacherId ?? enrollment?.studentId ?? "",
    ),
    [labelId, setLabelId] = useState(assignment?.labelId ?? ""),
    [status, setStatus] = useState<string>(
      assignment?.status ?? enrollment?.status ?? "ACTIVE",
    ),
    [joinedOn, setJoinedOn] = useState(() => {
      const start = enrollment?.history.at(-1)?.startAt;
      return (
        enrollment?.joinedOn ??
        (start ? vietnamToday(new Date(start)) : vietnamToday())
      );
    }),
    [search, setSearch] = useState(""),
    [data, setData] = useState<BulkPreview | null>(null),
    [error, setError] = useState("");
  const people = useManagementListQuery({
      entity: kind === "assignment" ? "teachers" : "students",
      filter: { search },
      page: 1,
      pageSize: 100,
    }),
    labels = useManagementListQuery(
      { entity: "labels", filter: {}, page: 1, pageSize: 100 },
      { skip: kind !== "assignment" },
    ),
    [previewAssignment, assignState] = usePreviewAssignmentMutation(),
    [previewEnrollment, enrollState] = usePreviewEnrollmentMutation();
  useUnsaved(!!personId && !data);
  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={() => {
        if (confirmLeave()) close();
      }}
    >
      <DialogTitle>
        {kind === "assignment" ? "Phân công giảng viên" : "Ghi danh học sinh"}
      </DialogTitle>
      <DialogContent>
        {data ? (
          <PreviewPanel
            preview={data}
            close={() => setData(null)}
            onSaved={close}
          />
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Quan hệ ổn định; phân công lại thêm giai đoạn lịch sử. Thêm người
              mới giữ người cũ.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Tìm ID / họ tên"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <TextField
              select
              label={kind === "assignment" ? "Giảng viên" : "Học sinh"}
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              disabled={!!assignment || !!enrollment}
            >
              <MenuItem value="">Chọn hồ sơ</MenuItem>
              {people.currentData?.items.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {recordName(p)} · {publicId(p.id)}
                </MenuItem>
              ))}
            </TextField>
            {(people.error || labels.error) && (
              <Feedback
                error={people.error || labels.error}
                retry={() => {
                  void people.refetch();
                  if (kind === "assignment") void labels.refetch();
                }}
              />
            )}
            {kind === "assignment" && (
              <TextField
                select
                label="Nhãn của lớp (không cấp quyền)"
                value={labelId}
                onChange={(e) => setLabelId(e.target.value)}
              >
                <MenuItem value="">Chọn nhãn</MenuItem>
                {labels.currentData?.items
                  .filter(
                    (l) =>
                      l.status === "ACTIVE" || l.id === assignment?.labelId,
                  )
                  .map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      {recordName(l)}
                      {l.status !== "ACTIVE" ? " (lịch sử)" : ""}
                    </MenuItem>
                  ))}
              </TextField>
            )}
            <TextField
              select
              label="Trạng thái quan hệ"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                if (
                  kind === "enrollment" &&
                  e.target.value === "ACTIVE" &&
                  enrollment?.status !== "ACTIVE"
                )
                  setJoinedOn(vietnamToday());
              }}
            >
              {(assignment
                ? ["ACTIVE", "ENDED", "COMPLETED"]
                : enrollment
                  ? enrollment.status === "COMPLETED"
                    ? ["COMPLETED"]
                    : ["ACTIVE", "ENDED"]
                  : ["ACTIVE"]
              ).map((s) => (
                <MenuItem key={s} value={s}>
                  {showValue(s)}
                </MenuItem>
              ))}
            </TextField>
            {kind === "enrollment" && (!enrollment || (status === "ACTIVE" && enrollment.status !== "ACTIVE")) && (
              <TextField
                size="small"
                type="date"
                label="Ngày tham gia lớp"
                value={joinedOn}
                onChange={(e) => setJoinedOn(e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: vietnamToday() } }}
                helperText="Được nhập ngày quá khứ. Giữ lịch sử các giai đoạn trước; kiểm tra ảnh hưởng trước khi lưu."
              />
            )}
            <Button
              variant="contained"
              loading={assignState.isLoading || enrollState.isLoading}
              disabled={
                !personId ||
                (kind === "assignment" && !labelId) ||
                (kind === "enrollment" && (!enrollment || (status === "ACTIVE" && enrollment.status !== "ACTIVE")) && !joinedOn)
              }
              onClick={async () => {
                try {
                  setError("");
                  setData(
                    kind === "assignment"
                      ? await previewAssignment({
                          classId,
                          teacherId: personId,
                          labelId,
                          status: status as TeacherClassAssignment["status"],
                          version: assignment?.version,
                        }).unwrap()
                      : await previewEnrollment({
                          classId,
                          studentId: personId,
                          status: status as Enrollment["status"],
                          ...(!enrollment || (status === "ACTIVE" && enrollment.status !== "ACTIVE") ? {joinedOn} : {}),
                          version: enrollment?.version,
                        }).unwrap(),
                  );
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Kiểm tra ảnh hưởng
            </Button>
            <Button
              onClick={() => {
                if (confirmLeave()) close();
              }}
            >
              Hủy
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function ProfilePage() {
  return (
    <ManagerOnly>
      <Profile />
    </ManagerOnly>
  );
}
export function ClassManagementProfile({ classId }: { classId: string }) {
  const access = useClassCapabilities(classId);
  return (
    <ManagerOnly>
      {access.loading || access.error ? (
        <Feedback
          loading={access.loading}
          error={access.error}
          retry={() => void access.retry()}
        />
      ) : access.access?.canView ? (
        <Profile
          entityOverride="classes"
          idOverride={access.access.classId}
          classAccessId={classId}
        />
      ) : (
        <Feedback empty="Bạn không có quyền xem lớp này." />
      )}
    </ManagerOnly>
  );
}
function Profile({
  entityOverride,
  idOverride,
  classAccessId,
}: {
  entityOverride?: Entity;
  idOverride?: string;
  classAccessId?: string;
} = {}) {
  const router = useRouter(),
    p = useSearchParams(),
    raw = p.get("entity"),
    entity: Entity =
      entityOverride ??
      (raw && Object.hasOwn(entityLabels, raw) ? (raw as Entity) : "students"),
    id = idOverride ?? p.get("id") ?? "";
  const access = useClassCapabilities(
    entity === "classes" ? (classAccessId ?? id) : "",
  );
  const q = useManagementDetailQuery({ entity, id }, { skip: !id }),
    [edit, setEdit] = useState(false),
    [createAccount, setCreateAccount] = useState(false),
    [tab, setTab] = useState<ClassTab>(initialClassTab(p.get("tab"))),
    [studentTab, setStudentTab] = useState(
      entity === "students" && p.get("tab") === "rewards"
        ? "rewards"
        : "profile",
    ),
    [classStudentEdit, setClassStudentEdit] = useState<{
      student: ManagedStudent;
      mode?: "status";
    } | null>(null),
    [showHistory, setShowHistory] = useState(false),
    [datesEdit, setDatesEdit] = useState<{classId: string; studentId: string} | null>(null),
    [relationship, setRelationship] = useState<{
      kind: "assignment" | "enrollment";
      classId: string;
      assignment?: TeacherClassAssignment;
      enrollment?: Enrollment;
    } | null>(null),
    [message, setMessage] = useState(""),
    [activation, setActivation] = useState<{
      code: string;
      expiresAt: string;
      kind: "STAFF" | "STUDENT";
    } | null>(null),
    [activate, activateState] = useActivationMutation();
  if (!id) return <Feedback empty="Thiếu ID hồ sơ." />;
  if (q.isLoading || (q.isFetching && !q.currentData) || q.error)
    return (
      <Feedback
        loading={q.isLoading || (q.isFetching && !q.currentData)}
        error={q.error}
        retry={() => void q.refetch()}
      />
    );
  const d = q.currentData,
    r = d?.record;
  if (!d || !r) return <Feedback empty="Không có hồ sơ." />;
  const account = entity === "accounts" && "roles" in r ? r : d.accounts[0];
  const saved = (n?: number, newId?: string) => {
    if (n && newId && newId !== id)
      router.replace(
        `/manage/profile/?entity=${entity}&id=${encodeURIComponent(newId)}`,
      );
    setEdit(false);
    setCreateAccount(false);
    setRelationship(null);
    setDatesEdit(null);
    if (n) setMessage(`Đã lưu ${n} thay đổi.`);
  };
  const profileContent = (
    <Stack spacing={2.5}>
      <Card>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          {Object.entries(r)
            .filter(
              ([key, value]) =>
                !(entity === "accounts" && key === "id") &&
                !(
                  /id$/i.test(key) &&
                  publicId(typeof value === "string" ? value : undefined) ===
                    "—"
                ) &&
                ![
                  "createdAt",
                  "updatedAt",
                  "version",
                  "studentCount",
                  "completedUnits",
                ].includes(key),
            )
            .map(([key, value]) => (
              <Box key={key}>
                <Typography variant="caption" color="text.secondary">
                  {fieldNames[key] ?? key}
                </Typography>
                <Typography
                  sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {showValue(value)}
                </Typography>
              </Box>
            ))}
        </Box>
      </Card>
      {(entity === "students" ||
        entity === "teachers" ||
        entity === "accounts") && (
        <Card>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Tài khoản liên kết
          </Typography>
          {account ? (
            <Stack spacing={1}>
              <Typography>
                ID đăng nhập: {account.loginId} · {showValue(account.status)}
              </Typography>
              <Typography>
                Loại: {account.kind} ·{" "}
                {account.roles.join(" | ") ||
                  "Học sinh (không vào Staff Portal)"}
              </Typography>
              <NavButton
                href={`/manage/profile/?entity=accounts&id=${encodeURIComponent(account.id)}`}
              >
                Quản lý tài khoản
              </NavButton>
              <Button
                loading={activateState.isLoading}
                disabled={account.status === "LOCKED"}
                onClick={async () => {
                  try {
                    setActivation(await activate(account.id).unwrap());
                  } catch {}
                }}
              >
                Tạo / cấp lại link kích hoạt
              </Button>
              {activateState.error && <Feedback error={activateState.error} />}
            </Stack>
          ) : (
            <Typography>Chưa có tài khoản.</Typography>
          )}
        </Card>
      )}
      {account && (
        <AccountSessions
          accountId={account.id}
          loginId={account.loginId}
          onSaved={setMessage}
        />
      )}
      {d.classes.length > 0 && entity !== "classes" && (
        <Card>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Lớp hiện tại & lịch sử
          </Typography>
          <Stack spacing={2}>
            {d.classes.map((c) => (
              <Box key={c.id}>
                <NavButton
                  href={`/manage/profile/?entity=classes&id=${encodeURIComponent(c.id)}`}
                >
                  {c.name}
                </NavButton>
                <Typography>{showValue(c.status)}</Typography>
                {entity === "students" && (
                  <NavButton
                    href={`/reports/?classId=${encodeURIComponent(c.id)}&studentId=${encodeURIComponent(r.id)}`}
                  >
                    Báo cáo học tập
                  </NavButton>
                )}
                <Progress completed={c.completedUnits} total={c.totalUnits} />
                {entity === "students" &&
                  d.enrollments
                    .filter((e) => e.classId === c.id)
                    .map((e) => (
                      <Button
                        key={e.id}
                        onClick={() =>
                          setRelationship({
                            kind: "enrollment",
                            classId: c.id,
                            enrollment: e,
                          })
                        }
                      >
                        Ghi danh: {showValue(e.status)} · Kiểm tra / khôi phục
                      </Button>
                    ))}
              </Box>
            ))}
          </Stack>
        </Card>
      )}
      {(entity === "classes" || entity === "teachers") && (
        <Card>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", gap: 1, mb: 2 }}
          >
            <Typography variant="h5">Phân công & lịch sử giảng dạy</Typography>
            {entity === "classes" && (
              <Button
                onClick={() =>
                  setRelationship({ kind: "assignment", classId: r.id })
                }
              >
                Phân công giảng viên
              </Button>
            )}
          </Stack>
          <AssignmentList
            detail={d}
            onEdit={(a) =>
              setRelationship({
                kind: "assignment",
                classId: a.classId,
                assignment: a,
              })
            }
          />
        </Card>
      )}
      {entity === "classes" && (
        <Card>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", gap: 1, mb: 2 }}
          >
            <Typography variant="h5">Học sinh của lớp</Typography>
            <Button
              onClick={() =>
                setRelationship({ kind: "enrollment", classId: r.id })
              }
            >
              Thêm / khôi phục ghi danh
            </Button>
          </Stack>
          <Button onClick={() => setShowHistory((v) => !v)}>
            {showHistory
              ? "Ẩn lịch sử"
              : "Hiện ghi danh đã kết thúc / hoàn thành"}
          </Button>
          <ClassStudentTable
            classId={access.access?.classId ?? r.id}
            students={d.students
              .filter((s) =>
                d.enrollments.some(
                  (e) =>
                    e.studentId === s.id &&
                    (showHistory ||
                      (e.status === "ACTIVE" && s.status === "ACTIVE")),
                ),
              )
              .map((s) => ({ ...s, name: s.fullName }))}
            profileHref={(s) =>
              `/manage/profile/?entity=students&id=${encodeURIComponent(s.id)}`
            }
            onEdit={(s) => {
              const managed = d.students.find((person) => person.id === s.id);
              if (managed) setClassStudentEdit({ student: managed });
            }}
            onJoined={(s) => {
              const enrollment = d.enrollments.find(
                (e) => e.studentId === s.id && e.classId === r.id,
              );
              if (enrollment)
                setDatesEdit({classId: r.id, studentId: enrollment.studentId});
            }}
            onStatus={(s) => {
              const managed = d.students.find((person) => person.id === s.id);
              if (managed)
                setClassStudentEdit({ student: managed, mode: "status" });
            }}
          />
        </Card>
      )}
      {entity === "students" && !!d.enrollments.length && (
        <Card>
          <Typography variant="h5">Lịch sử ghi danh</Typography>
          {d.enrollments.map((e) => (
            <Box key={e.id} sx={{ mt: 2 }}>
              <Button onClick={() => setDatesEdit({classId: e.classId, studentId: e.studentId})}>Sửa ngày nhập học / nghỉ học</Button>
              <Typography sx={{ fontWeight: 600 }}>
                {d.classes.find((c) => c.id === e.classId)?.name} ·{" "}
                {showValue(e.status)}
              </Typography>
              {e.history.map((h, i) => (
                <Typography key={i} variant="body2">
                  {h.startAt} → {h.endAt ?? "hiện tại"} · {showValue(h.status)}{" "}
                  · {h.reason}
                </Typography>
              ))}
            </Box>
          ))}
        </Card>
      )}
    </Stack>
  );
  return (
    <>
      <Title
        title={recordName(r)}
        subtitle={`${entityLabels[entity]} · ${publicId("loginId" in r ? r.loginId : r.id)} · ${showValue(r.status)}`}
        actions={
          <>
            <NavButton href={`/manage/list/?entity=${entity}`}>
              ← Danh sách
            </NavButton>
            {(entity !== "classes" || tab === "profile") && (
              <Button variant="contained" onClick={() => setEdit(true)}>
                Chỉnh sửa hồ sơ / trạng thái
              </Button>
            )}
            {(entity === "students" || entity === "teachers") &&
              !d.accounts.length && (
                <Button onClick={() => setCreateAccount(true)}>
                  Tạo tài khoản liên kết
                </Button>
              )}
          </>
        }
      />
      {entity === "classes" && (
        <ClassRewardActions
          classId={r.id}
          name={recordName(r)}
          editable={false}
        />
      )}
      {entity === "classes" && "totalUnits" in r ? (
        <ClassDetailTabs
          attendance={
            access.access?.canView ? (
              <AttendancePanel classId={access.access.classId} />
            ) : (
              <Feedback error={access.error} loading={access.loading} />
            )
          }
          value={tab}
          onChange={setTab}
          thread={
            <>
              <Feedback
                loading={access.loading}
                error={access.error}
                retry={() => void access.retry()}
              />
              {access.access && (
                <ClassThreadFeed
                  key={access.access.classId}
                  classId={access.access.classId}
                  editable={false}
                />
              )}
            </>
          }
          progress={
            access.access?.canView ? (
              <ClassProgress
                classId={access.access.classId}
                classInfo={r}
                editable={false}
              />
            ) : (
              <Feedback
                loading={access.loading}
                error={access.error}
                retry={() => void access.retry()}
                empty={
                  !access.loading && !access.error
                    ? "Không có quyền xem nội dung học tập của lớp."
                    : undefined
                }
              />
            )
          }
          profile={profileContent}
        />
      ) : (
        <>
          <Tabs
            value={studentTab}
            onChange={(_, value: string) => {
              if (confirmLeave()) setStudentTab(value);
            }}
            sx={{ mb: 2 }}
          >
            <Tab label="Hồ sơ & quan hệ" value="profile" />
            {entity === "students" && (
              <Tab label="Điểm tích luỹ" value="rewards" />
            )}
          </Tabs>
          {entity === "students" && studentTab === "rewards" ? (
            <StudentRewards
              classId={d.classes[0]?.id ?? ""}
              studentId={r.id}
              name={recordName(r)}
            />
          ) : (
            profileContent
          )}
        </>
      )}
      {classStudentEdit && (
        <EntityEditor
          entity="students"
          record={classStudentEdit.student}
          mode={classStudentEdit.mode}
          close={(n) => {
            setClassStudentEdit(null);
            if (n) setMessage(`Đã lưu ${n} thay đổi.`);
          }}
        />
      )}
      {edit && (
        <EntityEditor
          entity={entity}
          record={r}
          initial={
            entity === "teachers"
              ? { roles: account?.roles ?? ["TEACHER"] }
              : undefined
          }
          close={saved}
        />
      )}
      {createAccount && (
        <EntityEditor
          entity="accounts"
          initial={{
            profileId: r.id,
            loginId: r.id,
            kind: entity === "students" ? "STUDENT" : "STAFF",
            roles: entity === "students" ? [] : ["TEACHER"],
          }}
          close={saved}
        />
      )}
      {relationship && <RelationshipEditor {...relationship} close={saved} />}
      {datesEdit && <EnrollmentDatesEditor {...datesEdit} close={saved} />}
      <Dialog open={!!activation} onClose={() => setActivation(null)} fullWidth>
        <DialogTitle>Link kích hoạt ngắn hạn</DialogTitle>
        <DialogContent>
          {activation && (
            <Stack spacing={2}>
              <Alert severity="info">
                Dùng một lần, hết hạn{" "}
                {new Date(activation.expiresAt).toLocaleString("vi-VN")}. Cấp
                lại làm link cũ vô hiệu. Không xuất mã vào Excel.
              </Alert>
              <Typography>
                {activation.kind === "STUDENT"
                  ? "Link đặt mật khẩu học sinh; tài khoản này không đăng nhập Staff Portal."
                  : "Link đặt mật khẩu Staff."}
              </Typography>
              <TextField
                label="Link kích hoạt"
                value={
                  typeof window === "undefined"
                    ? ""
                    : `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/activate/#code=${encodeURIComponent(activation.code)}`
                }
                slotProps={{ input: { readOnly: true } }}
              />
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/activate/#code=${encodeURIComponent(activation.code)}`,
                    );
                    setMessage("Đã sao chép link.");
                  } catch {
                    setMessage("Hãy sao chép link từ ô phía trên.");
                  }
                }}
              >
                Sao chép link
              </Button>
              <Button onClick={() => setActivation(null)}>Đóng</Button>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
      <Snackbar
        open={!!message}
        message={message}
        autoHideDuration={5000}
        onClose={() => setMessage("")}
      />
    </>
  );
}
function AssignmentList({
  detail: d,
  onEdit,
}: {
  detail: ProfileDetail;
  onEdit: (a: TeacherClassAssignment) => void;
}) {
  if (!d.assignments.length) return <Feedback empty="Chưa có phân công." />;
  return (
    <>
      <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              {[
                "Giảng viên / Lớp",
                "Nhãn theo lớp",
                "Trạng thái",
                "Thời gian",
                "",
              ].map((h, i) => (
                <TableCell key={i}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {d.assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  {d.teachers.find((t) => t.id === a.teacherId)?.fullName ??
                    publicId(a.teacherId)}
                  <br />
                  {d.classes.find((c) => c.id === a.classId)?.name ??
                    publicId(a.classId)}
                </TableCell>
                <TableCell>
                  {d.labels.find((l) => l.id === a.labelId)?.name ??
                    publicId(a.labelId)}
                </TableCell>
                <TableCell>{showValue(a.status)}</TableCell>
                <TableCell>
                  {a.startAt.slice(0, 10)} →{" "}
                  {a.endAt?.slice(0, 10) ?? "hiện tại"}
                </TableCell>
                <TableCell>
                  <Button onClick={() => onEdit(a)}>Cập nhật phụ trách</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack spacing={2} sx={{ display: { md: "none" } }}>
        {d.assignments.map((a) => (
          <Box key={a.id}>
            <Typography sx={{ fontWeight: 600 }}>
              {d.teachers.find((t) => t.id === a.teacherId)?.fullName ??
                publicId(a.teacherId)}{" "}
              ·{" "}
              {d.classes.find((c) => c.id === a.classId)?.name ??
                publicId(a.classId)}
            </Typography>
            <Typography>
              {d.labels.find((l) => l.id === a.labelId)?.name} ·{" "}
              {showValue(a.status)}
            </Typography>
            <Button onClick={() => onEdit(a)}>Cập nhật phụ trách</Button>
          </Box>
        ))}
      </Stack>
      {d.assignments.map((a) => (
        <Box component="details" key={a.id} sx={{ mt: 2 }}>
          <Typography
            component="summary"
            sx={{ cursor: "pointer", minHeight: 44 }}
          >
            Lịch sử {publicId(a.teacherId)} / {publicId(a.classId)} ·{" "}
            {a.history.length} giai đoạn / sự kiện
          </Typography>
          {a.history.map((h, i) => (
            <Typography key={i} variant="body2" sx={{ py: 1 }}>
              {h.startAt} → {h.endAt ?? "hiện tại"} · {showValue(h.status)} ·{" "}
              {d.labels.find((l) => l.id === h.labelId)?.name} · {h.reason}
            </Typography>
          ))}
        </Box>
      ))}
    </>
  );
}
