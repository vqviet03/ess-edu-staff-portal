"use client";
import { useRouter } from "next/navigation";
import TableRow, { type TableRowProps } from "@mui/material/TableRow";
import { confirmLeave } from "./unsaved";

// Keep links and editable controls independent of the row's primary navigation.
export function NavigationRow({
  href,
  sx,
  ...props
}: TableRowProps & { href: string }) {
  const router = useRouter();
  const open = () => {
    if (confirmLeave()) router.push(href);
  };
  return (
    <TableRow
      {...props}
      hover
      tabIndex={0}
      sx={[
        {
          cursor: "pointer",
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: -2,
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          (event.target as Element).closest(
            'a,button,input,select,textarea,label,.MuiButtonBase-root,[contenteditable="true"],[role="button"],[role="checkbox"]',
          ) ||
          window.getSelection()?.toString()
        )
          return;
        if (event.metaKey || event.ctrlKey)
          window.open(href, "_blank", "noopener");
        else open();
      }}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          open();
        }
      }}
    />
  );
}
