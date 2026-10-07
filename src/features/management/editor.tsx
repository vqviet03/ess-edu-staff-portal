"use client";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { usePreviewChangesMutation, useSuggestIdentifierMutation, useCheckIdentifierMutation } from "@/api/management-api";
import { errorMessage } from "@/api/base-query";
import { confirmLeave, useUnsaved } from "@/shared/unsaved";
import type { BulkPreview, Entity, ManagedRecord } from "./models";
import { defaults, entitySchemas, fieldNames, fields } from "./validation";
import { entityLabels, PreviewPanel, statusLabels } from "./shared";
export function options(entity: Entity, key: string): string[] | null {
  if (key === "roles") return ["TEACHER", "MANAGER", "TEACHER|MANAGER"];
  if (key === "kind") return ["STAFF", "STUDENT"];
  if (key !== "status") return null;
  return entity === "classes"
    ? ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "INACTIVE"]
    : entity === "accounts"
      ? ["PENDING", "ACTIVE", "LOCKED"]
      : entity === "labels"
        ? ["ACTIVE", "INACTIVE"]
        : ["ACTIVE", "PAUSED", "INACTIVE"];
}
export function EntityEditor({
  entity,
  record,
  initial,
  close,
}: {
  entity: Entity;
  record?: ManagedRecord;
  initial?: Record<string, unknown>;
  close: (saved?: number, newId?: string) => void;
}) {
  const [baseVersion] = useState(record?.version);
  const [customId, setCustomId] = useState(!!record || !!initial?.id), [customName, setCustomName] = useState(!!initial?.name), [customCode, setCustomCode] = useState(!!initial?.code), [identifierMessage, setIdentifierMessage] = useState("");
  const [suggestIdentifier, suggesting] = useSuggestIdentifierMutation(), [checkIdentifier, checking] = useCheckIdentifierMutation();
  const generation = useRef(0);
  const [preview, state] = usePreviewChangesMutation(),
    [data, setData] = useState<BulkPreview | null>(null),
    [error, setError] = useState("");
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { isDirty },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(
      entitySchemas[entity] as z.ZodType<
        Record<string, unknown>,
        Record<string, unknown>
      >,
      undefined,
      { raw: true },
    ),
    defaultValues: {
      ...defaults(entity, entity === "accounts" ? crypto.randomUUID() : ""),
      ...record,
      ...initial,
    },
  });
  const kind = useWatch({ control, name: "kind" });
  const fullName = useWatch({ control, name: "fullName" });
  const profile = entity === "students" || entity === "teachers";
  useEffect(() => {
    if (record || !profile || customId) return;
    const sequence = ++generation.current;
    let active = true;
    if (!String(fullName ?? "").trim()) { setValue("id", ""); return; }
    const timer = setTimeout(() => {
      void suggestIdentifier({ entity, fullName: String(fullName) }).unwrap().then((r) => {
        if (active && generation.current === sequence) { setValue("id", r.id, { shouldValidate: true }); setIdentifierMessage("ID được backend sinh; bạn có thể chỉnh sửa."); }
      }).catch((e) => { if (active && generation.current === sequence) setIdentifierMessage(errorMessage(e)); });
    }, 350);
    return () => { clearTimeout(timer); active = false; };
  }, [entity, profile, record, fullName, customId, suggestIdentifier, setValue]);
  useEffect(() => {
    if (record || entity !== "classes" || customId) return;
    let active = true;
    void suggestIdentifier({ entity }).unwrap().then((r) => { if (active) setValue("id", r.id); }).catch((e) => { if (active) setIdentifierMessage(errorMessage(e)); });
    return () => { active = false; };
  }, [entity, record, customId, suggestIdentifier, setValue]);
  const watchedId = useWatch({ control, name: "id" }), suffix = useWatch({ control, name: "nameSuffix" });
  useEffect(() => {
    if (record || entity !== "classes" || !watchedId) return;
    const suggestion = String(watchedId) + (suffix ? "-" + String(suffix).trim().replace(/^-/, "") : "");
    if (!customName) setValue("name", suggestion);
    if (!customCode) setValue("code", suggestion);
  }, [record, entity, watchedId, suffix, customName, customCode, setValue]);
  useUnsaved(isDirty && !data);
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
        {record ? "Chỉnh sửa" : "Thêm"} {entityLabels[entity]}
      </DialogTitle>
      <DialogContent>
        {data ? (
          <PreviewPanel
            preview={data}
            close={() => setData(null)}
            onSaved={(saved) => close(saved, data.changes.find(c => c.entity === entity)?.after.id)}
          />
        ) : (
          <Stack
            component="form"
            spacing={2}
            sx={{ pt: 1 }}
            onSubmit={handleSubmit(async (values) => {
              try {
                setError("");
                const result = await preview({
                    entity,
                    rows: [{ ...values, ...(record ? { id: record.id, ...(entity !== "accounts" && values.id !== record.id ? { newId: values.id } : {}) } : {}), version: baseVersion }],
                    clearFields: [
                      "nickname",
                      "dateOfBirth",
                      "parentContact",
                      "email",
                      "phone",
                      "notes",
                    ].filter(
                      (k) =>
                        (values[k] === null || values[k] === "") &&
                        record &&
                        (record as unknown as Record<string, unknown>)[k],
                    ),
                    mode: record ? "UPDATE" : "CREATE",
                  }).unwrap();
                if (!record && result.changes[0]) setValue("id", result.changes[0].id);
                setData(result);
              } catch (e) {
                setError(errorMessage(e));
              }
            })}
          >
            {error && <Alert severity="error">{error}</Alert>}
            {fields[entity].filter(key => !(record && key === "nameSuffix")).map((key) => (
              <Controller
                key={key}
                control={control}
                name={key}
                render={({ field, fieldState }) => {
                  const choices =
                    entity === "accounts" &&
                    key === "roles" &&
                    kind === "STUDENT"
                      ? [""]
                      : options(entity, key);
                  const input = (
                    <TextField
                      {...field}
                      value={
                        Array.isArray(field.value)
                          ? field.value.join("|")
                          : (field.value ?? "")
                      }
                      select={!!choices}
                      label={fieldNames[key]}
                      error={!!fieldState.error}
                      helperText={
                        fieldState.error?.message ??
                        (key === "id" && record
                          ? identifierMessage || "Quản lý có thể đổi ID. Liên kết và lịch sử được giữ; ID đăng nhập trùng ID cũ đổi theo."
                          : key === "id" && !record
                            ? entity === "classes" ? identifierMessage || "ID gợi ý; có thể nhập ID riêng và kiểm tra tồn tại." : identifierMessage || "Để trống để sinh từ tên; ID trùng sẽ thêm số trong preview."
                            : key === "nameSuffix" ? "Chỉ dùng gợi ý khi tạo. Tên / mã lớp có thể nhập riêng."
                          : key === "profileId"
                            ? "Liên kết đúng ID hồ sơ đã có"
                            : "")
                      }
                      disabled={
                        (key === "id" && !!record && entity === "accounts") ||
                        (entity === "accounts" &&
                          !!record &&
                          ["profileId", "kind"].includes(key)) ||
                        (entity === "accounts" &&
                          !record &&
                          key === "status") ||
                        (entity === "accounts" &&
                          kind === "STUDENT" &&
                          key === "roles")
                      }
                      multiline={key === "notes"}
                      minRows={key === "notes" ? 2 : undefined}
                      type={
                        key === "dateOfBirth"
                          ? "date"
                          : key === "totalUnits"
                            ? "number"
                            : "text"
                      }
                      slotProps={
                        key === "dateOfBirth"
                          ? { inputLabel: { shrink: true } }
                          : undefined
                      }
                      onChange={(e) => {
                        if (key === "id" && entity !== "accounts") { generation.current++; setCustomId(true); setIdentifierMessage(""); }
                        if (key === "name") setCustomName(true);
                        if (key === "code") setCustomCode(true);
                        if (key === "kind") {
                          setValue(
                            "roles",
                            e.target.value === "STUDENT" ? [] : ["TEACHER"],
                          );
                          setValue("profileId", "");
                        }
                        field.onChange(
                          key === "roles"
                            ? e.target.value.split("|")
                            : key === "totalUnits"
                              ? Number(e.target.value)
                              : key === "dateOfBirth"
                                ? e.target.value || null
                                : e.target.value,
                        );
                      }}
                    >
                      {choices?.map((c) => (
                        <MenuItem key={c} value={c}>
                          {statusLabels[c] ??
                            (c === "STUDENT"
                              ? "Học sinh"
                              : c === "STAFF"
                                ? "Staff"
                                : c || "Không có vai trò Staff")}
                        </MenuItem>
                      ))}
                    </TextField>
                  );
                  return <Stack spacing={1}>{input}{key === "id" && entity !== "accounts" && <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                    <Button loading={checking.isLoading} disabled={!String(field.value ?? "").trim()} onClick={async () => {
                      try {
                        const requested = String(getValues("id"));
                        const r = await checkIdentifier({ entity, id: requested, excludeId: record?.id }).unwrap();
                        if (getValues("id") !== requested) return;
                        setIdentifierMessage(r.isAvailable ? "ID có thể sử dụng; backend kiểm tra lại khi lưu." : `ID đã dùng. Gợi ý: ${r.id}.${record ? " Hãy chọn ID khác trước khi lưu." : ""}`);
                      } catch (e) { setIdentifierMessage(errorMessage(e)); }
                    }}>Kiểm tra trùng</Button>
                    {!record && profile && <Button loading={suggesting.isLoading} onClick={() => { setCustomId(false); generation.current++; setIdentifierMessage(""); }}>Tự sinh từ tên</Button>}
                  </Stack>}</Stack>;
                }}
              />
            ))}
            {!record && (entity === "students" || entity === "teachers") && (
              <Controller
                name="createAccount"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!field.value}
                        onChange={(_, v) => field.onChange(v)}
                      />
                    }
                    label="Tạo tài khoản PENDING cùng hồ sơ"
                  />
                )}
              />
            )}
            <Stack direction="row" spacing={1}>
              <Button
                onClick={() => {
                  if (confirmLeave()) close();
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="contained"
                loading={state.isLoading}
              >
                Kiểm tra & xem trước
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
