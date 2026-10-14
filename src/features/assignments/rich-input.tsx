"use client";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { MaterialViewer } from "@/features/materials/viewer";
import type { MaterialFile } from "@/features/materials/models";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Media } from "./models";
export interface RichInputHandle {
  selectionStart: number;
  selectionEnd: number;
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
}
function plain(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node instanceof HTMLElement && node.dataset.token)
    return node.dataset.token;
  if (node.nodeName === "BR") return "\n";
  return Array.from(node.childNodes)
    .map(
      (n, i) =>
        ((n.nodeName === "DIV" || n.nodeName === "P") && i ? "\n" : "") +
        plain(n),
    )
    .join("");
}
function decorate(host: HTMLElement, value: string, media: Media[]) {
  const fragment = document.createDocumentFragment();
  for (const part of value.split(
    /(\[file:[a-fA-F0-9-]+\]|https?:\/\/[^\s<>]+)/g,
  )) {
    const file = part.startsWith("[file:")
      ? media.find((m) => m.materialId === part.slice(6, -1))?.file
      : undefined;
    let domain = "";
    try {
      if (/^https?:\/\//.test(part)) {
        const u = new URL(part);
        if (!u.username && !u.password) domain = u.hostname;
      }
    } catch {}
    if (file || domain) {
      const chip = document.createElement("span");
      chip.dataset.token = part;
      chip.contentEditable = "false";
      chip.className = file ? "assignment-chip-file" : "assignment-chip-link";
      chip.textContent = file?.displayName ?? domain;
      chip.title = file?.displayName ?? part;
      chip.style.cssText =
        "display:inline-block;border-radius:6px;padding:2px 6px;font-size:12px;max-width:100%;vertical-align:middle;overflow-wrap:anywhere";
      fragment.append(chip);
    } else fragment.append(document.createTextNode(part));
  }
  host.replaceChildren(fragment);
}
export function RichInput({
  label,
  value,
  onChange,
  media = [],
  disabled = false,
  inputRef,
  minRows = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  media?: Media[];
  disabled?: boolean;
  inputRef?: Ref<RichInputHandle>;
  minRows?: number;
}) {
  const [view, setView] = useState<MaterialFile | null>(null);
  const host = useRef<HTMLDivElement>(null),
    selection = useRef({ start: value.length, end: value.length });
  const remember = () => {
    const el = host.current,
      s = window.getSelection();
    if (
      !el ||
      !s?.rangeCount ||
      !el.contains(s.anchorNode) ||
      !el.contains(s.focusNode)
    )
      return;
    const r = s.getRangeAt(0),
      prefix = r.cloneRange();
    prefix.selectNodeContents(el);
    prefix.setEnd(r.startContainer, r.startOffset);
    selection.current = {
      start: plain(prefix.cloneContents()).length,
      end:
        plain(prefix.cloneContents()).length + plain(r.cloneContents()).length,
    };
  };
  useImperativeHandle(inputRef, () => ({
    get selectionStart() {
      return selection.current.start;
    },
    get selectionEnd() {
      return selection.current.end;
    },
    focus: () => host.current?.focus(),
    setSelectionRange: (start, end) => {
      const el = host.current;
      if (!el) return;
      const find = (index: number): [Node, number] => {
        for (const node of Array.from(el.childNodes)) {
          const length = plain(node).length;
          if (index <= length) {
            if (node.nodeType === Node.TEXT_NODE) return [node, index];
            return [
              el,
              Array.from(el.childNodes).indexOf(node) + (index ? 1 : 0),
            ];
          }
          index -= length;
        }
        return [el, el.childNodes.length];
      };
      const [a, i] = find(start),
        [b, j] = find(end),
        r = document.createRange();
      r.setStart(a, i);
      r.setEnd(b, j);
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
      selection.current = { start, end };
    },
  }));
  useEffect(() => {
    const el = host.current;
    if (el && plain(el) !== value) decorate(el, value, media);
  }, [value, media]);
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        ref={host}
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        aria-disabled={disabled}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onClick={(event) => {
          const token = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-token]",
          )?.dataset.token;
          if (token?.startsWith("[file:")) {
            const f = media.find(
              (m) => m.materialId === token.slice(6, -1),
            )?.file;
            if (f) setView(f);
          } else if (token) {
            try {
              const u = new URL(token);
              if (
                ["http:", "https:"].includes(u.protocol) &&
                !u.username &&
                !u.password
              )
                window.open(u.href, "_blank", "noopener,noreferrer");
            } catch {}
          }
        }}
        onKeyUp={remember}
        onMouseUp={remember}
        onInput={() => {
          const el = host.current;
          if (el) {
            remember();
            onChange(plain(el).slice(0, 20000));
          }
        }}
        onBlur={() => {
          const el = host.current;
          if (el) {
            remember();
            decorate(el, value, media);
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          const s = window.getSelection();
          if (!s?.rangeCount) return;
          const r = s.getRangeAt(0);
          r.deleteContents();
          const text = document.createTextNode(
            e.clipboardData.getData("text/plain"),
          );
          r.insertNode(text);
          r.setStartAfter(text);
          r.collapse(true);
          s.removeAllRanges();
          s.addRange(r);
          remember();
          if (host.current) onChange(plain(host.current).slice(0, 20000));
        }}
        sx={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          minHeight: minRows * 20 + 20,
          p: "9px 10px",
          fontSize: 14,
          border: "1px solid var(--a-border)",
          borderRadius: "6px",
          outline: 0,
          "&:focus": {
            borderColor: "var(--a-green)",
            boxShadow: "0 0 0 1px var(--a-green)",
          },
          opacity: disabled ? 0.7 : 1,
        }}
      />
      {view && <MaterialViewer file={view} close={() => setView(null)} />}
    </Box>
  );
}
