import { api, unwrap } from "./api";
import type { Envelope } from "@/types";
import { takeConnection } from "@/features/materials/storage-connections";
import type { Area, CursorPage } from "@/features/materials/models";
export interface StorageWrite {
  id?: string; publicId: string; name: string; category: Area; capacityBytes: number;
  status: "ACTIVE" | "DRAINING" | "INACTIVE"; version: number; reason: string; connectionKey?: string;
}
export interface TransferJob {
  id: string; version: number; filePublicId: string; fileName: string; fromStorageId: string; toStorageId: string;
  status: "PENDING" | "FAILED" | "DONE" | "CANCELLED"; switched: boolean; attempts: number; lastError: string | null;
}
const invalidate = ["Storages", "Materials", "Audit"] as const;
export const storageApi = api.injectEndpoints({ endpoints: b => ({
  saveStorage: b.mutation<{ id: string; version: number }, StorageWrite>({
    async queryFn({ id, connectionKey, ...body }, _api, _options, baseQuery) {
      const connection = takeConnection(connectionKey);
      if (connectionKey && !connection) return { error: { status: "CUSTOM_ERROR", error: "Kết nối đã được dùng. Nhập lại thông số kết nối." } };
      const r = await baseQuery({ url: id ? `/storages/${encodeURIComponent(id)}` : "/storages", method: id ? "PATCH" : "POST", body: { ...body, connection } });
      return r.error ? { error: r.error } : { data: (r.data as Envelope<{ id: string; version: number }>).data };
    },
    invalidatesTags: (r) => r ? [...invalidate] : [],
  }),
  probeStorage: b.mutation<{ connected: boolean }, { connectionKey: string }>({
    async queryFn({ connectionKey }, _api, _options, baseQuery) {
      const connection = takeConnection(connectionKey);
      if (!connection) return { error: { status: "CUSTOM_ERROR", error: "Nhập lại thông số kết nối để kiểm tra." } };
      const r = await baseQuery({ url: "/storages/connection-check", method: "POST", body: connection });
      return r.error ? { error: r.error } : { data: (r.data as Envelope<{ connected: boolean }>).data };
    },
  }),
  deactivateStorage: b.mutation<unknown, { id: string; version: number; reason: string }>({
    query: ({ id, ...body }) => ({ url: `/storages/${encodeURIComponent(id)}`, method: "DELETE", body }),
    invalidatesTags: (r, e) => e ? [] : [...invalidate],
  }),
  transfers: b.query<CursorPage<TransferJob>, string | undefined>({
    query: storageId => ({ url: "/materials/storage-transfers", params: { storageId } }),
    transformResponse: unwrap<CursorPage<TransferJob>>, providesTags: ["Storages"],
  }),
  moveStorageFiles: b.mutation<{ status: string; count: number }, { targetStorageId: string; ids: string[]; versions: Record<string, number>; reason: string }>({
    query: body => ({ url: "/materials/storage-transfers", method: "POST", body }),
    transformResponse: unwrap<{ status: string; count: number }>, invalidatesTags: (r) => r ? [...invalidate] : [],
  }),
  retryTransfer: b.mutation<unknown, { id: string; version: number }>({
    query: ({ id, ...body }) => ({ url: `/materials/storage-transfers/${id}/retry`, method: "POST", body }),
    invalidatesTags: (r, e) => e ? [] : [...invalidate],
  }),
  cancelTransfer: b.mutation<unknown, { id: string; version: number; reason: string }>({
    query: ({ id, ...body }) => ({ url: `/materials/storage-transfers/${id}/cancel`, method: "POST", body }),
    invalidatesTags: (r, e) => e ? [] : [...invalidate],
  }),
}) });
export const { useSaveStorageMutation, useProbeStorageMutation, useDeactivateStorageMutation, useTransfersQuery, useMoveStorageFilesMutation, useRetryTransferMutation, useCancelTransferMutation } = storageApi;
