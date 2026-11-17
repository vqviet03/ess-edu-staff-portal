"use client";
import Stack from "@mui/material/Stack";
import { StudentNotificationField } from "./delivery";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import {
  useNotificationSettingsQuery,
  type NotificationPriority,
} from "@/api/notification-policy-api";
import { NotificationOptionsButton } from "./options-button";
export function NotificationPriorityForm({
  classId,
  feature,
  value,
  onChange,
  notifyStudents,
  onNotifyStudentsChange,
}: {
  classId: string;
  feature: string;
  value: NotificationPriority | undefined;
  onChange: (v: NotificationPriority | undefined) => void;
  notifyStudents?: boolean;
  onNotifyStudentsChange?: (v: boolean | undefined) => void;
}) {
  const q = useNotificationSettingsQuery(classId, { skip: !classId });
  const configured =
      q.currentData?.find((r) => r.feature === feature)?.priority ?? "NORMAL",
    forced = ["SCHEDULE", "APPROVAL", "CONSENT"].includes(feature);
  return (
    <Stack spacing={1}>
      {onNotifyStudentsChange && (
        <StudentNotificationField
          value={notifyStudents}
          onChange={onNotifyStudentsChange}
        />
      )}
      <TextField
        size="small"
        select
        label="Ưu tiên thông báo"
        value={forced ? "IMPORTANT" : (value ?? "")}
        disabled={forced}
        onChange={(e) =>
          onChange(
            e.target.value
              ? (e.target.value as NotificationPriority)
              : undefined,
          )
        }
      >
        <MenuItem value="">
          Theo cài đặt lớp (
          {configured === "IMPORTANT" ? "quan trọng" : "thường"})
        </MenuItem>
        <MenuItem value="NORMAL">Thường</MenuItem>
        <MenuItem value="IMPORTANT">Quan trọng · giữ đến khi đọc</MenuItem>
      </TextField>
    </Stack>
  );
}

export function NotificationPrioritySelect(
  props: Parameters<typeof NotificationPriorityForm>[0],
) {
  return (
    <NotificationOptionsButton important={props.value === "IMPORTANT"}>
      <NotificationPriorityForm {...props} />
    </NotificationOptionsButton>
  );
}
