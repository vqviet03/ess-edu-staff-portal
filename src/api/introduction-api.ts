import { api, unwrap } from "./api";
import type {
  IntroductionPage,
  IntroductionContent,
} from "@/features/introduction/models";
interface Inquiry {
  id: string;
  parentName: string;
  phone: string;
  studentName: string;
  grade: string;
  status: string;
  createdAt: string;
}
export const introApi = api
  .enhanceEndpoints({ addTagTypes: ["Introduction"] })
  .injectEndpoints({
    endpoints: (b) => ({
      introductionDraft: b.query<IntroductionPage, void>({
        query: () => "/introduction/manage",
        transformResponse: unwrap<IntroductionPage>,
        providesTags: ["Introduction"],
      }),
      saveIntroduction: b.mutation<
        IntroductionPage,
        { version: number; content: IntroductionContent }
      >({
        query: (body) => ({ url: "/introduction/manage", method: "PUT", body }),
        transformResponse: unwrap<IntroductionPage>,
        invalidatesTags: ["Introduction"],
      }),
      publishIntroduction: b.mutation<
        IntroductionPage,
        { version: number; publish: boolean }
      >({
        query: ({ version, publish }) => ({
          url: `/introduction/${publish ? "publish" : "withdraw"}`,
          method: "POST",
          body: { version },
        }),
        transformResponse: unwrap<IntroductionPage>,
        invalidatesTags: ["Introduction"],
      }),
      introductionInquiries: b.query<
        { items: Inquiry[]; nextCursor: string | null },
        { cursor?: string }
      >({
        query: (params) => ({ url: "/introduction/registrations", params }),
        transformResponse: unwrap<{
          items: Inquiry[];
          nextCursor: string | null;
        }>,
      }),
    }),
  });
export const {
  useIntroductionDraftQuery,
  useSaveIntroductionMutation,
  usePublishIntroductionMutation,
  useIntroductionInquiriesQuery,
} = introApi;
