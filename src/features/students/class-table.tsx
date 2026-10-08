"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import { Feedback, StatusChip } from "@/shared/ui";
import { publicId } from "@/shared/public-id";
import { confirmLeave } from "@/shared/unsaved";
import type { Student } from "@/types";

export function ClassStudentTable({
  students,
  classId,
  profileHref,
  onEdit,
  onStatus,
}: {
  students: Student[];
  classId: string;
  profileHref: (student: Student) => string;
  onEdit?: (student: Student) => void;
  onStatus?: (student: Student) => void;
}) {
  const router = useRouter(),
    [menu, setMenu] = useState<{
      anchor: HTMLElement;
      student: Student;
    } | null>(null);
  if (!students.length)
    return <Feedback empty="Lớp chưa có học sinh trong phạm vi đang xem." />;
  const open = (student: Student) => {
    if (confirmLeave()) router.push(profileHref(student));
  };
  return (
    <>
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="Danh sách học sinh của lớp">
          <TableHead>
            <TableRow>
              {[
                "ID",
                "Họ tên",
                "Biệt danh",
                "Ngày sinh",
                "Trạng thái",
                "Thao tác",
              ].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((s) => (
              <TableRow
                key={s.id}
                hover
                tabIndex={0}
                aria-label={`Xem hồ sơ ${s.name}`}
                sx={{
                  cursor: "pointer",
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: -2,
                  },
                }}
                onClick={(e) => {
                  if (!(e.target as Element).closest("a,button")) open(s);
                }}
                onKeyDown={(e) => {
                  if (
                    e.target === e.currentTarget &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    open(s);
                  }
                }}
              >
                <TableCell>
                  {publicId(s.publicId, s.studentCode, s.id)}
                </TableCell>
                <TableCell>
                  <Link
                    href={profileHref(s)}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell>{s.nickname || "—"}</TableCell>
                <TableCell>
                  {s.dateOfBirth
                    ? new Date(s.dateOfBirth + "T00:00:00").toLocaleDateString(
                        "vi-VN",
                      )
                    : "—"}
                </TableCell>
                <TableCell>
                  <StatusChip status={s.status} />
                </TableCell>
                <TableCell>
                  <IconButton
                    aria-label={`Thao tác học sinh ${s.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu({ anchor: e.currentTarget, student: s });
                    }}
                    sx={{ minWidth: 44, minHeight: 44 }}
                  >
                    <MoreHoriz />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem
          component={Link}
          href={`/reports/?classId=${encodeURIComponent(classId)}&studentId=${encodeURIComponent(menu?.student.id ?? "")}`}
          onClick={() => setMenu(null)}
        >
          Báo cáo học tập
        </MenuItem>
        <MenuItem
          disabled={!onEdit}
          onClick={() => {
            if (menu) onEdit?.(menu.student);
            setMenu(null);
          }}
        >
          Chỉnh sửa thông tin học sinh
        </MenuItem>
        <MenuItem
          disabled={!onStatus}
          title={
            !onStatus
              ? "Chỉ quản lý được cập nhật trạng thái hồ sơ."
              : undefined
          }
          onClick={() => {
            if (menu) onStatus?.(menu.student);
            setMenu(null);
          }}
        >
          Cập nhật trạng thái
        </MenuItem>
      </Menu>
    </>
  );
}
