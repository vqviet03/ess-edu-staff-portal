import { setApplicationName } from "@/features/settings/branding";
import type { Envelope } from "@/types";
import { api, unwrap } from "./api";
import type { ApplicationSettings, SettingsProposal } from "@/features/settings/models";
export const settingsApi = api.enhanceEndpoints({ addTagTypes: ["ApplicationSettings", "SettingsProposals"] }).injectEndpoints({
  endpoints: (b) => ({
    applicationSettings: b.query<ApplicationSettings, void>({ query: () => "/application-settings", transformResponse: (r: Envelope<ApplicationSettings>) => { setApplicationName(r.data.appName); return r.data; }, providesTags: ["ApplicationSettings"], keepUnusedDataFor: 86400 }),
    settingsProposals: b.query<{ items: SettingsProposal[] }, void>({ query: () => "/manager/settings/proposals", transformResponse: unwrap<{ items: SettingsProposal[] }>, providesTags: ["SettingsProposals"] }),
    proposeSettings: b.mutation<{ id: string; status: string }, ApplicationSettings & { reason: string; confirmSolo: boolean }>({ query: (body) => ({ url: "/manager/settings/proposals", method: "POST", body }), transformResponse: unwrap<{ id: string; status: string }>, invalidatesTags: (_, e) => e ? [] : ["ApplicationSettings", "SettingsProposals", "Audit"] }),
    decideSettings: b.mutation<{ id: string; status: string }, { id: string; decision: "APPROVED" | "REJECTED"; version: number }>({ query: ({ id, ...body }) => ({ url: `/manager/settings/proposals/${encodeURIComponent(id)}/decision`, method: "POST", body }), transformResponse: unwrap<{ id: string; status: string }>, invalidatesTags: (_, e) => e ? [] : ["ApplicationSettings", "SettingsProposals", "Audit"] }),
  }),
});
export const { useApplicationSettingsQuery, useSettingsProposalsQuery, useProposeSettingsMutation, useDecideSettingsMutation } = settingsApi;
