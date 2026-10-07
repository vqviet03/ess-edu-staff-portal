"use client";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { chooseWorkspace } from "@/store/workspace";
import { capabilities, validWorkspace, workspaces } from "./capabilities";
import { useClassAccessQuery } from "@/api/management-api";
import Alert from "@mui/material/Alert";
export function useWorkspace() {
  const staff = useAppSelector((s) => s.auth.session?.teacher),
    preferred = useAppSelector((s) => s.workspace.selected),
    dispatch = useAppDispatch();
  const selected = validWorkspace(staff, preferred);
  return {
    staff,
    selected,
    allowed: workspaces(staff),
    choose: (value: "manager" | "teacher") => {
      const next = validWorkspace(staff, value);
      dispatch(chooseWorkspace(next));
      try {
        if (next && staff)
          localStorage.setItem(`ess.workspace.${staff.id}`, next);
      } catch {}
    },
  };
}
export function useClassCapabilities(classId: string) {
  const { staff, selected } = useWorkspace(),
    q = useClassAccessQuery(classId, {
      skip: !classId || !staff,
    });
  return {
    ...capabilities(staff ?? null, selected, q.currentData),
    access: q.currentData,
    loading: q.isLoading || (q.isFetching && !q.currentData),
    error:
      q.error && "status" in q.error && q.error.status === 404
        ? undefined
        : q.error,
    retry: q.refetch,
  };
}
export function ReadOnlyNotice({ editable }: { editable: boolean }) {
  return editable ? null : (
    <Alert severity="info" sx={{ mb: 2 }}>
      Chỉ xem nội dung học tập. Để sửa cần chuyển sang Giảng viên, có tài
      khoản/hồ sơ hoạt động và đang phụ trách chính lớp ACTIVE này.
    </Alert>
  );
}

export function WorkspaceRuntime() {
  const staff = useAppSelector((s) => s.auth.session?.teacher),
    dispatch = useAppDispatch();
  useEffect(() => {
    if (!staff) return;
    try {
      const value = localStorage.getItem(`ess.workspace.${staff.id}`);
      dispatch(
        chooseWorkspace(
          validWorkspace(
            staff,
            value === "teacher" || value === "manager" ? value : null,
          ),
        ),
      );
    } catch {
      dispatch(chooseWorkspace(validWorkspace(staff)));
    }
  }, [staff, dispatch]);
  return null;
}
