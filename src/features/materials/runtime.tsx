"use client";
import { useEffect, useRef } from "react";
import { useNotificationsQuery, libraryApi } from "@/api/library-api";
import { useAppDispatch, useAppSelector } from "@/store";
export function LibraryRefresh() {
  const user = useAppSelector((s) => s.auth.session?.teacher.id),
    q = useNotificationsQuery({}, { skip: !user, pollingInterval: 30000 }),
    previous = useRef<{ user?: string; ids: string[] }>({ ids: [] }),
    dispatch = useAppDispatch();
  useEffect(() => {
    if (!q.currentData) return;
    const ids = q.currentData.items.map((n) => n.id);
    if (
      previous.current.user === user &&
      ids.some((id) => !previous.current.ids.includes(id))
    )
      dispatch(
        libraryApi.util.invalidateTags([
          "Materials",
          "Folders",
          "Posts",
          "Comments",
          "Storages",
          "DeletionRequests",
        ]),
      );
    previous.current = { user, ids };
  }, [q.currentData, user, dispatch]);
  return null;
}
