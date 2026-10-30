"use client";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useAppSelector } from "@/store";
import { useMcpConsentMutation } from "@/api/mcp-api";
import { errorMessage } from "@/api/base-query";
import { chatgptCallback, consentRequest } from "./models";
export function McpConsentPage() {
  const params = useSearchParams();
  const request = consentRequest(new URLSearchParams(params.toString()));
  const teacher = useAppSelector((s) => s.auth.session?.teacher);
  const available = (teacher?.roles ?? [])
    .filter((r) => r === "TEACHER" || r === "MANAGER")
    .map((r) => r.toLowerCase());
  const [roles, setRoles] = useState(available);
  const [send, state] = useMcpConsentMutation();
  const submitting = useRef(false);
  const [error, setError] = useState<unknown>();
  async function finish(approve: boolean) {
    if (!request || submitting.current) return;
    submitting.current = true;
    setError(undefined);
    try {
      const result = await send({ ...request, roles, approve }).unwrap();
      if (!chatgptCallback(result.redirectUrl))
        throw new Error("Địa chỉ phản hồi ChatGPT không hợp lệ.");
      window.location.assign(result.redirectUrl);
    } catch (e) {
      setError(e);
    } finally {
      submitting.current = false;
    }
  }
  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, maxWidth: 600, mx: "auto" }}>
      <Stack spacing={2}>
        <Typography component="h1" variant="h5">
          Kết nối ChatGPT với EES
        </Typography>
        {!request ? (
          <Alert severity="error">
            Yêu cầu kết nối không hợp lệ. Hãy mở lại từ ChatGPT.
          </Alert>
        ) : (
          <>
            <Typography>Tài khoản: {teacher?.name}</Typography>
            <Alert severity="info">
              Chỉ đọc: ChatGPT được tra cứu lớp, học sinh, lịch học, điểm danh,
              điểm thưởng và báo cáo trong phạm vi vai trò anh/chị chọn. Kết nối
              không sửa dữ liệu EES.
            </Alert>
            <Stack>
              {available.map((role) => (
                <FormControlLabel
                  key={role}
                  control={
                    <Checkbox
                      checked={roles.includes(role)}
                      disabled={state.isLoading}
                      onChange={(_, checked) =>
                        setRoles((current) =>
                          checked
                            ? [...current, role]
                            : current.filter((r) => r !== role),
                        )
                      }
                    />
                  }
                  label={role === "manager" ? "Quản lý" : "Giảng viên"}
                />
              ))}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Thời hạn tuân theo chính sách phiên đăng nhập của tài khoản. Có
              thể thu hồi kết nối bất kỳ lúc nào trong Hồ sơ cá nhân.
            </Typography>
            {error != null && (
              <Alert severity="error">{errorMessage(error)}</Alert>
            )}
            <Stack direction="row" spacing={1}>
              <Button
                disabled={state.isLoading}
                onClick={() => void finish(false)}
              >
                Hủy
              </Button>
              <Button
                variant="contained"
                disabled={state.isLoading || roles.length === 0}
                onClick={() => void finish(true)}
              >
                {state.isLoading ? "Đang kết nối…" : "Cho phép tra cứu"}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
