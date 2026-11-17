import { api } from "./api";
import type {
  Catalog,
  Checkout,
  CheckoutItem,
  Gift,
  Page,
  Preview,
  Redemption,
  Workflow,
} from "@/features/gifts/models";
const unwrap = <T>(r: { data: T }) => r.data;
const root = "/reward-gifts";
const scoped = (
  type: "Gift" | "GiftCart" | "Redemption" | "GiftCatalog",
  id: string,
) => [{ type, id }];
export const giftsApi = api
  .enhanceEndpoints({
    addTagTypes: ["GiftCatalog", "Gift", "GiftCart", "Redemption"],
  })
  .injectEndpoints({
    endpoints: (b) => ({
      giftOptions: b.query<
        {
          classes: { id: string; name: string; publicId?: string }[];
          teachers: { id: string; name: string }[];
        },
        void
      >({
        query: () => `${root}/options`,
        transformResponse: unwrap<{
          classes: { id: string; name: string; publicId?: string }[];
          teachers: { id: string; name: string }[];
        }>,
      }),
      giftClasses: b.query<
        { id: string; name: string; status: string }[],
        void
      >({
        query: () => `${root}/my-classes`,
        transformResponse: unwrap<
          { id: string; name: string; status: string }[]
        >,
      }),
      giftRecipients: b.query<
        { id: string; name: string; nickname: string; code: string }[],
        string
      >({
        query: (id) => `${root}/classes/${id}/recipients`,
        transformResponse: unwrap<
          { id: string; name: string; nickname: string; code: string }[]
        >,
      }),
      giftCatalogs: b.query<Page<Catalog>, { search?: string; page?: number }>({
        query: (params) => ({ url: `${root}/catalogs`, params }),
        transformResponse: unwrap<Page<Catalog>>,
        providesTags: (r) => [
          ...scoped("GiftCatalog", "LIST"),
          ...(r?.items.map((c) => ({
            type: "GiftCatalog" as const,
            id: c.id,
          })) ?? []),
        ],
      }),
      giftStatistics: b.query<
        { gifts: number; available: number; reserved: number; classes: number },
        string
      >({
        query: (id) => `${root}/catalogs/${id}/statistics`,
        transformResponse: unwrap<{
          gifts: number;
          available: number;
          reserved: number;
          classes: number;
        }>,
        providesTags: (_, __, id) => scoped("Gift", id),
      }),
      giftCatalog: b.query<Catalog, string>({
        query: (id) => `${root}/catalogs/${id}`,
        transformResponse: unwrap<Catalog>,
        providesTags: (_, __, id) => scoped("GiftCatalog", id),
      }),
      saveGiftCatalog: b.mutation<
        Catalog,
        { id?: string; name: string; description: string; version?: number }
      >({
        query: ({ id, ...body }) => ({
          url: `${root}/catalogs${id ? `/${id}` : ""}`,
          method: id ? "PUT" : "POST",
          body,
        }),
        transformResponse: unwrap<Catalog>,
        invalidatesTags: (r) => [
          ...scoped("GiftCatalog", "LIST"),
          ...(r ? scoped("GiftCatalog", r.id) : []),
        ],
      }),
      giftCategories: b.query<
        string[],
        { catalogId?: string; classId?: string }
      >({
        query: (params) => ({ url: `${root}/categories`, params }),
        transformResponse: unwrap<string[]>,
        providesTags: (_, __, q) =>
          scoped("Gift", q.catalogId ?? q.classId ?? ""),
      }),
      gifts: b.query<
        Page<Gift>,
        {
          catalogId?: string;
          classId?: string;
          search?: string;
          category?: string;
          status?: string;
          favorite?: boolean;
          inStock?: boolean;
          affordable?: boolean;
          studentId?: string;
          page?: number;
        }
      >({
        query: (params) => ({ url: root, params: { pageSize: 24, ...params } }),
        transformResponse: unwrap<Page<Gift>>,
        providesTags: (r, _, q) => [
          ...scoped("Gift", q.catalogId ?? q.classId ?? ""),
          ...(r?.items.map((g) => ({ type: "Gift" as const, id: g.id })) ?? []),
        ],
      }),
      gift: b.query<Gift, { id: string; classId?: string }>({
        query: ({ id, ...params }) => ({ url: `${root}/gifts/${id}`, params }),
        transformResponse: unwrap<Gift>,
        providesTags: (_, __, q) => scoped("Gift", q.id),
      }),
      saveGift: b.mutation<
        Gift,
        {
          id?: string;
          catalogId: string;
          name: string;
          description: string;
          category: string;
          points: number;
          quantity?: number;
          status: string;
          version?: number;
        }
      >({
        query: ({ id, catalogId, ...body }) => ({
          url: `${root}/catalogs/${catalogId}/gifts${id ? `/${id}` : ""}`,
          method: id ? "PUT" : "POST",
          body,
        }),
        transformResponse: unwrap<Gift>,
        invalidatesTags: (r, _, q) => [
          ...scoped("Gift", q.catalogId),
          ...(r ? scoped("Gift", r.id) : []),
        ],
      }),
      giftFavorite: b.mutation<
        void,
        { classId: string; giftId: string; add: boolean }
      >({
        query: ({ classId, giftId, add }) => ({
          url: `${root}/classes/${classId}/favorites/${giftId}`,
          method: add ? "PUT" : "DELETE",
        }),
        invalidatesTags: (_, __, q) => scoped("Gift", q.giftId),
      }),
      giftCart: b.query<Preview, { classId: string; studentId: string }>({
        query: (q) =>
          `${root}/classes/${q.classId}/students/${q.studentId}/cart`,
        transformResponse: unwrap<Preview>,
        providesTags: (_, __, q) => [
          ...scoped("GiftCart", `${q.classId}:${q.studentId}`),
          ...scoped("GiftCart", q.classId),
        ],
      }),
      setGiftCart: b.mutation<
        void,
        { classId: string; studentId: string } & CheckoutItem
      >({
        query: ({ classId, studentId, ...body }) => ({
          url: `${root}/classes/${classId}/students/${studentId}/cart`,
          method: "PUT",
          body,
        }),
        invalidatesTags: (_, __, q) =>
          scoped("GiftCart", `${q.classId}:${q.studentId}`),
      }),
      previewGifts: b.mutation<Preview, Checkout>({
        query: (body) => ({ url: `${root}/preview`, method: "POST", body }),
        transformResponse: unwrap<Preview>,
      }),
      confirmGifts: b.mutation<Workflow, Checkout & { key: string }>({
        query: ({ key, ...body }) => ({
          url: `${root}/confirm`,
          method: "POST",
          body,
          headers: { "Idempotency-Key": key },
        }),
        transformResponse: unwrap<Workflow>,
      }),
      giftWorkflow: b.query<Workflow, string>({
        query: (id) => `${root}/workflows/${id}`,
        transformResponse: unwrap<Workflow>,
        providesTags: (r, _, id) => [
          ...scoped("Redemption", id),
          ...(r?.classId ? scoped("Redemption", r.classId) : []),
        ],
      }),
      giftRedemptions: b.query<
        Page<Redemption>,
        {
          classId?: string;
          studentId?: string;
          status?: string;
          search?: string;
          page?: number;
        }
      >({
        query: (params) => ({ url: `${root}/redemptions`, params }),
        transformResponse: unwrap<Page<Redemption>>,
        providesTags: (r, _, q) => [
          ...scoped("Redemption", q.classId ?? "LIST"),
          ...(r?.items.map((x) => ({
            type: "Redemption" as const,
            id: x.id,
          })) ?? []),
        ],
      }),
      deliverGift: b.mutation<void, Redemption>({
        query: ({ id }) => ({
          url: `${root}/redemptions/${id}/deliver`,
          method: "POST",
        }),
        invalidatesTags: (_, __, order) => [
          ...scoped("Redemption", order.id),
          ...order.items.flatMap((item) => [
            ...scoped("Gift", item.giftId),
            ...scoped("Gift", item.catalogId),
          ]),
        ],
      }),
      catalogGiftVisibility: b.query<
        { giftId: string; classId: string }[],
        { id: string; page: number }
      >({
        query: ({ id, page }) => ({
          url: `${root}/catalogs/${id}/visibility`,
          params: { page },
        }),
        transformResponse: unwrap<{ giftId: string; classId: string }[]>,
        providesTags: (r, _, q) => [
          ...scoped("Gift", q.id),
          ...(r ?? []).map((v) => ({ type: "Gift" as const, id: v.giftId })),
        ],
      }),
      giftVisibility: b.query<string[], string>({
        query: (id) => `${root}/gifts/${id}/visibility`,
        transformResponse: unwrap<string[]>,
        providesTags: (_, __, id) => scoped("Gift", id),
      }),
      saveGiftVisibility: b.mutation<
        void,
        {
          id: string;
          catalogId?: string;
          rows: { classId: string; visible: boolean }[];
        }
      >({
        query: ({ id, rows }) => ({
          url: `${root}/gifts/${id}/visibility`,
          method: "PUT",
          body: rows,
        }),
        invalidatesTags: (_, __, q) => [
          ...scoped("Gift", q.id),
          ...(q.catalogId ? scoped("Gift", q.catalogId) : []),
        ],
      }),
      linkGiftClass: b.mutation<
        Catalog,
        { catalogId: string; classId: string; add: boolean }
      >({
        query: ({ catalogId, classId, add }) => ({
          url: `${root}/catalogs/${catalogId}/classes/${classId}`,
          method: add ? "PUT" : "DELETE",
        }),
        transformResponse: unwrap<Catalog>,
        invalidatesTags: (_, __, q) => [
          ...scoped("GiftCatalog", q.catalogId),
          ...scoped("Gift", q.classId),
        ],
      }),
      giftManager: b.mutation<
        Catalog,
        { catalogId: string; teacherId: string; add: boolean }
      >({
        query: ({ catalogId, teacherId, add }) => ({
          url: `${root}/catalogs/${catalogId}/managers/${teacherId}`,
          method: add ? "PUT" : "DELETE",
        }),
        transformResponse: unwrap<Catalog>,
        invalidatesTags: (_, __, q) => scoped("GiftCatalog", q.catalogId),
      }),
      reuseGiftCatalog: b.mutation<
        { mode: string; catalog: Catalog; workflowId: string | null },
        { id: string; classId: string; requestId: string }
      >({
        query: ({ id, ...body }) => ({
          url: `${root}/catalogs/${id}/reuse`,
          method: "POST",
          body,
        }),
        transformResponse: unwrap<{
          mode: string;
          catalog: Catalog;
          workflowId: string | null;
        }>,
        invalidatesTags: scoped("GiftCatalog", "LIST"),
      }),
      adjustGiftInventory: b.mutation<
        void,
        {
          id: string;
          catalogId?: string;
          kind: string;
          quantity: number;
          reason: string;
          key: string;
        }
      >({
        query: ({ id, key, ...body }) => ({
          url: `${root}/gifts/${id}/inventory`,
          method: "POST",
          body,
          headers: { "Idempotency-Key": key },
        }),
        invalidatesTags: (_, __, q) => [
          ...scoped("Gift", q.id),
          ...(q.catalogId ? scoped("Gift", q.catalogId) : []),
        ],
      }),
      giftInventory: b.query<
        Page<{
          id: string;
          kind: string;
          quantity: number;
          reason: string;
          createdAt: string;
        }>,
        { id: string; page?: number }
      >({
        query: ({ id, ...params }) => ({
          url: `${root}/gifts/${id}/inventory`,
          params,
        }),
        transformResponse: unwrap<
          Page<{
            id: string;
            kind: string;
            quantity: number;
            reason: string;
            createdAt: string;
          }>
        >,
        providesTags: (_, __, q) => scoped("Gift", q.id),
      }),
      giftDeleteImpact: b.query<
        { classes: number; pendingRequests: number; files: number },
        { catalogId: string; giftId?: string }
      >({
        query: ({ catalogId, ...params }) => ({
          url: `${root}/catalogs/${catalogId}/delete-impact`,
          params,
        }),
        transformResponse: unwrap<{
          classes: number;
          pendingRequests: number;
          files: number;
        }>,
      }),
      deleteGift: b.mutation<
        Workflow,
        {
          catalogId: string;
          giftId?: string;
          confirmation: string;
          reason: string;
        }
      >({
        query: ({ catalogId, giftId, ...body }) => ({
          url: `${root}/catalogs/${catalogId}/delete`,
          params: { giftId },
          method: "POST",
          body,
        }),
        transformResponse: unwrap<Workflow>,
        invalidatesTags: (_, __, q) => [
          ...scoped("Gift", q.giftId ?? q.catalogId),
          ...scoped("GiftCatalog", q.catalogId),
        ],
      }),
      giftDeletion: b.query<Workflow, string>({
        query: (id) => `${root}/deletions/${id}`,
        transformResponse: unwrap<Workflow>,
      }),
      importGiftMedia: b.mutation<
        Workflow,
        { id: string; fileId: string; position: number }
      >({
        query: ({ id, ...body }) => ({
          url: `${root}/gifts/${id}/media/import`,
          method: "POST",
          body,
        }),
        transformResponse: unwrap<Workflow>,
      }),
      addGiftMedia: b.mutation<
        Gift,
        { id: string; fileId: string; position: number }
      >({
        query: ({ id, ...body }) => ({
          url: `${root}/gifts/${id}/media`,
          method: "POST",
          body,
        }),
        transformResponse: unwrap<Gift>,
        invalidatesTags: (_, __, q) => scoped("Gift", q.id),
      }),
    }),
  });
export const {
  useGiftOptionsQuery,
  useGiftClassesQuery,
  useGiftRecipientsQuery,
  useGiftCatalogsQuery,
  useGiftCatalogQuery,
  useGiftStatisticsQuery,
  useSaveGiftCatalogMutation,
  useGiftsQuery,
  useGiftCategoriesQuery,
  useSaveGiftMutation,
  useGiftQuery,
  useGiftFavoriteMutation,
  useGiftCartQuery,
  useSetGiftCartMutation,
  usePreviewGiftsMutation,
  useConfirmGiftsMutation,
  useGiftWorkflowQuery,
  useGiftRedemptionsQuery,
  useDeliverGiftMutation,
  useGiftVisibilityQuery,
  useCatalogGiftVisibilityQuery,
  useSaveGiftVisibilityMutation,
  useLinkGiftClassMutation,
  useGiftManagerMutation,
  useReuseGiftCatalogMutation,
  useAdjustGiftInventoryMutation,
  useGiftInventoryQuery,
  useGiftDeleteImpactQuery,
  useDeleteGiftMutation,
  useGiftDeletionQuery,
  useAddGiftMediaMutation,
  useImportGiftMediaMutation,
} = giftsApi;
