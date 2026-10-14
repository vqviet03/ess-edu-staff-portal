"use client";
import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import {
  useNotificationPreferencesQuery,
  useSaveNotificationPreferencesMutation,
  useSubscribePushMutation,
  useUnsubscribePushMutation,
} from "@/api/pwa-api";
import { errorMessage } from "@/api/base-query";
import { notificationTypes, wantsNotification } from "./models";
import {
  applicationKey,
  portal,
  registerWorker,
  supportsPush,
  hiddenPreferenceTypes,
} from "./platform";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function NotificationPreferencesPanel() {
  const q = useNotificationPreferencesQuery(),
    [save, saving] = useSaveNotificationPreferencesMutation(),
    [subscribe, subscribing] = useSubscribePushMutation(),
    [unsubscribe] = useUnsubscribePushMutation(),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState(""),
    [install, setInstall] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const listener = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  const busy = saving.isLoading || subscribing.isLoading;
  async function enable(enabled: boolean) {
    if (!q.data || busy) return;
    setError(undefined);
    setMessage("");
    try {
      if (enabled) {
        if (!supportsPush())
          throw new Error(
            "Trình duyệt chưa hỗ trợ push. Trên iPhone/iPad, hãy thêm ứng dụng vào màn hình chính rồi mở từ icon.",
          );
        if (!q.data.publicKey)
          throw new Error("Thông báo đẩy chưa được cấu hình.");
        if ((await Notification.requestPermission()) !== "granted")
          throw new Error("Chưa được cấp quyền thông báo.");
        const registration = await registerWorker();
        await navigator.serviceWorker.ready;
        const device =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationKey(q.data.publicKey),
          }));
        const json = device.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth)
          throw new Error("Không lấy được thông tin thiết bị.");
        await subscribe({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          portal,
        }).unwrap();
      } else if (supportsPush()) {
        const registration = await navigator.serviceWorker.getRegistration();
        const device = await registration?.pushManager.getSubscription();
        if (device) {
          await unsubscribe({ endpoint: device.endpoint }).unwrap();
          await device.unsubscribe();
        }
      }
      await save({
        pushEnabled: enabled,
        types: q.data.types,
        version: q.data.version,
      }).unwrap();
      setMessage(enabled ? "Đã bật thông báo đẩy." : "Đã tắt thông báo đẩy.");
    } catch (e) {
      setError(e instanceof Error ? e.message : e);
    }
  }
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6">Thông báo & ứng dụng</Typography>
        {q.isLoading && <LinearProgress />}
        {(error || q.error) && (
          <Alert severity="error">
            {typeof error === "string" ? error : errorMessage(error || q.error)}
          </Alert>
        )}
        {message && <Alert severity="success">{message}</Alert>}
        {q.data && (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={q.data.pushEnabled}
                  disabled={busy || !q.data.configured}
                  onChange={(_, v) => void enable(v)}
                />
              }
              label="Thông báo đẩy"
            />
            {!q.data.configured && (
              <Alert severity="info">
                Thông báo đẩy chưa được bật cho hệ thống.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              Chọn loại thông báo trên thiết bị và trong ứng dụng. Tương tác và
              thông báo ít quan trọng mặc định được tắt; thông báo vẫn lưu trong
              hộp thư.
            </Typography>
            {Object.entries(notificationTypes)
              .filter(([type]) => !hiddenPreferenceTypes.includes(type))
              .map(([type, label]) => (
                <FormControlLabel
                  key={type}
                  label={label}
                  control={
                    <Switch
                      checked={wantsNotification(type, "NORMAL", q.data!.types)}
                      disabled={busy}
                      onChange={async (_, value) => {
                        setError(undefined);
                        try {
                          await save({
                            pushEnabled: q.data!.pushEnabled,
                            types: { ...q.data!.types, [type]: value },
                            version: q.data!.version,
                          }).unwrap();
                        } catch (e) {
                          setError(e);
                        }
                      }}
                    />
                  }
                />
              ))}
          </>
        )}
        <Typography variant="body2">
          Thêm vào màn hình chính để mở ứng dụng trong cửa sổ riêng. Trên
          iPhone/iPad: Chia sẻ → Thêm vào Màn hình chính.
        </Typography>
        {install && (
          <Button
            onClick={async () => {
              await install.prompt();
              await install.userChoice;
              setInstall(null);
            }}
          >
            Cài ứng dụng
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
