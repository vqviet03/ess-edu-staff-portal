"use client";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";

/**
 * In-app replacements for window.confirm/window.prompt. Native dialogs are unstyled, ignore the
 * theme and are suppressed by some in-app browsers (Zalo, Facebook), which silently cancels the
 * action. Requests are queued and shown one at a time by <DialogHost/>; nothing runs while idle.
 */
export type ConfirmOptions = {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Destructive actions use the error colour. */
  danger?: boolean;
};
export type TextOptions = Omit<ConfirmOptions, "message"> & {
  message?: ReactNode;
  label: string;
  initialValue?: string;
  /** Empty input keeps the confirm button disabled and explains why. */
  required?: boolean;
  requiredText?: string;
  multiline?: boolean;
  maxLength?: number;
  validate?: (value: string) => string | undefined;
};
type Request =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | {
      kind: "text";
      options: TextOptions;
      resolve: (value: string | null) => void;
    };

let queue: Request[] = [];
let hosts = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const current = () => queue[0];
const settle = () => {
  queue = queue.slice(1);
  emit();
};
function enqueue(request: Request) {
  if (!hosts) {
    // No host mounted (e.g. during teardown): refuse rather than act without consent.
    if (request.kind === "confirm") request.resolve(false);
    else request.resolve(null);
    return;
  }
  queue = [...queue, request];
  emit();
}

export const askConfirm = (options: ConfirmOptions) =>
  new Promise<boolean>((resolve) =>
    enqueue({ kind: "confirm", options, resolve }),
  );

/** Resolves to the trimmed text, or null when cancelled. */
export const askText = (options: TextOptions) =>
  new Promise<string | null>((resolve) =>
    enqueue({ kind: "text", options, resolve }),
  );

export function DialogHost() {
  const request = useSyncExternalStore(subscribe, current, () => undefined);
  useEffect(() => {
    hosts++;
    return () => {
      hosts--;
      if (hosts) return;
      const pending = queue;
      queue = [];
      pending.forEach((r) =>
        r.kind === "confirm" ? r.resolve(false) : r.resolve(null),
      );
      emit();
    };
  }, []);
  if (!request) return null;
  return <ActiveDialog key={queueKey(request)} request={request} />;
}
const keys = new WeakMap<Request, number>();
let nextKey = 0;
function queueKey(request: Request) {
  if (!keys.has(request)) keys.set(request, nextKey++);
  return keys.get(request)!;
}

function ActiveDialog({ request }: { request: Request }) {
  const options = request.options;
  const [value, setValue] = useState(
    request.kind === "text" ? (request.options.initialValue ?? "") : "",
  );
  const [touched, setTouched] = useState(false);
  const text = request.kind === "text" ? request.options : undefined;
  const trimmed = value.trim();
  const problem = text
    ? text.required !== false && !trimmed
      ? (text.requiredText ?? "Vui lòng nhập nội dung.")
      : text.maxLength && trimmed.length > text.maxLength
        ? `Tối đa ${text.maxLength} ký tự.`
        : text.validate?.(trimmed)
    : undefined;
  const close = (accepted: boolean) => {
    if (request.kind === "confirm") request.resolve(accepted);
    else request.resolve(accepted ? trimmed : null);
    settle();
  };
  const titleId = "app-dialog-title";
  return (
    <Dialog
      open
      onClose={() => close(false)}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="xs"
      data-app-dialog={request.kind}
    >
      <DialogTitle id={titleId}>
        {options.title ?? (request.kind === "text" ? text!.label : "Xác nhận")}
      </DialogTitle>
      <DialogContent>
        {options.message != null && (
          <DialogContentText sx={{ whiteSpace: "pre-line", mb: text ? 2 : 0 }}>
            {options.message}
          </DialogContentText>
        )}
        {text && (
          <TextField
            autoFocus
            fullWidth
            // Room for the floating label when no message sits above the field.
            sx={{ mt: options.message == null ? 1 : 0 }}
            size="small"
            label={text.label}
            value={value}
            multiline={text.multiline}
            minRows={text.multiline ? 2 : undefined}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !text.multiline) {
                e.preventDefault();
                setTouched(true);
                if (!problem) close(true);
              }
            }}
            error={!!problem && (touched || !!trimmed)}
            helperText={problem}
            slotProps={{ htmlInput: { maxLength: text.maxLength } }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => close(false)}>
          {options.cancelText ?? "Hủy"}
        </Button>
        <Button
          variant="contained"
          color={options.danger ? "error" : "primary"}
          autoFocus={!text}
          disabled={!!problem}
          onClick={() => close(true)}
        >
          {options.confirmText ?? "Đồng ý"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
