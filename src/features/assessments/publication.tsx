"use client";
import {useSearchParams} from "next/navigation";
import {NotificationPrioritySelect} from "@/features/notifications/priority";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Assessment, Publication } from "@/types";
import { usePublishAssessmentMutation } from "@/api/api";
import { errorMessage } from "@/api/base-query";
import { Card, Feedback } from "@/shared/ui";
import { confirmLeave } from "@/shared/unsaved";

export function PublicationPanel({ assessment, publication, canEdit, loading, error, retry, onSuccess }: {
  assessment: Assessment; publication?: Publication; canEdit: boolean; loading: boolean; error: unknown; retry: () => void; onSuccess: (message: string) => void;
}) {
  const classId=useSearchParams().get("classId")??"";
  const [priority,setPriority]=useState<"NORMAL"|"IMPORTANT"|undefined>();
  const [publish, state] = usePublishAssessmentMutation(), [failure, setFailure] = useState("");
  const published = publication?.isPublished ?? false;
  const replaced = !!publication?.sourceAssessmentId && !published;
  async function submit() {
    const question = published ? "Gỡ báo cáo này khỏi trang học sinh? Điểm nhập được giữ lại; sau đó có thể chuyển bài về nháp để sửa." : replaced ? "Unit đang có báo cáo từ bài khác. Thay báo cáo đó bằng điểm và nhận xét của bài này?" : "Công bố điểm và nhận xét của bài này cho học sinh trong lớp?";
    if (!confirmLeave() || !window.confirm(question)) return;
    setFailure("");
    try {
      await publish({ id: assessment.id, version: assessment.version, publish: !published,notificationPriority:priority }).unwrap();
      onSuccess(published ? "Đã gỡ công bố. Có thể chuyển bài về nháp để chỉnh sửa." : "Đã công bố báo cáo. Học sinh chọn đúng lớp và tải lại trang để xem.");
    } catch (e) { setFailure(errorMessage(e)); }
  }
  return <Card>
    <Typography component="h2" variant="h6" sx={{ mb: 1 }}>Báo cáo trên trang học sinh</Typography>
    {loading ? <Feedback loading/> : error ? <Feedback error={error} retry={retry}/> : !publication ? <Feedback empty="Chưa có trạng thái công bố."/> : <Stack spacing={2}>
      <Alert severity={published ? "success" : "info"}>
        {published ? `Đã công bố cho học sinh · Unit ${publication.unitNumber}` : "Chưa công bố cho học sinh. Hoàn thành bài chỉ khóa điểm; công bố sẽ tạo báo cáo trên trang học sinh."}
      </Alert>
      {!!publication.publishedAt && published && <Typography variant="body2" color="text.secondary">Công bố lúc {new Date(publication.publishedAt).toLocaleString("vi-VN")}</Typography>}
      {replaced && <Alert severity="warning">Unit này đang dùng báo cáo của bài đánh giá khác. Công bố bài này sẽ thay nguồn báo cáo.</Alert>}
      {!publication.unitId && <Alert severity="warning">Phiên cần liên kết một Unit đã được cấu hình trong lớp trước khi công bố.</Alert>}
      {!published && assessment.status === "DRAFT" && <Typography variant="body2">Nhập đủ điểm hoặc xác nhận vắng cho từng học sinh, rồi đánh dấu hoàn thành bài trước khi công bố.</Typography>}
      {!!failure && <Alert severity="error">{failure}</Alert>}
      {canEdit&&<NotificationPrioritySelect classId={classId} feature="SCORE" value={priority} onChange={setPriority}/>}
      <Button variant={published ? "outlined" : "contained"} onClick={() => void submit()} disabled={!canEdit || state.isLoading || !publication.unitId || (!published && assessment.status !== "COMPLETED")} sx={{ alignSelf: "flex-start" }}>
        {state.isLoading ? "Đang xử lý…" : published ? "Gỡ công bố báo cáo" : "Công bố báo cáo cho học sinh"}
      </Button>
    </Stack>}
  </Card>;
}
