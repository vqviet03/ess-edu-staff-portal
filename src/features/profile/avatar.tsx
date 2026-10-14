"use client";
import Avatar from "@mui/material/Avatar";
import Person from "@mui/icons-material/Person";
import Pets from "@mui/icons-material/Pets";
import CrueltyFree from "@mui/icons-material/CrueltyFree";
import EmojiNature from "@mui/icons-material/EmojiNature";
import SmartToy from "@mui/icons-material/SmartToy";
import Face from "@mui/icons-material/Face";
import ChildCare from "@mui/icons-material/ChildCare";
import { useContentQuery } from "@/api/library-api";
import type { AvatarChoice } from "./models";
const icons = {
  person: Person,
  pets: Pets,
  rabbit: CrueltyFree,
  nature: EmojiNature,
  robot: SmartToy,
  face: Face,
  child: ChildCare,
};
export function ProfileAvatar({
  value,
  name,
  size = 36,
}: {
  value?: AvatarChoice | null;
  name: string;
  size?: number;
}) {
  const image = useContentQuery(
    { id: value?.fileId ?? "", purpose: "thumbnail" },
    { skip: !value?.fileId },
  );
  const Icon = icons[(value?.icon ?? "person") as keyof typeof icons] ?? Person;
  return (
    <Avatar
      alt={name}
      src={image.data}
      sx={{
        width: size,
        height: size,
        bgcolor: value?.color ?? "#CDEBD7",
        color: "#385349",
        fontSize: size / 2,
      }}
    >
      <Icon sx={{ fontSize: size * 0.6 }} />
    </Avatar>
  );
}
