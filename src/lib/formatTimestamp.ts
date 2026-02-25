import { format, isSameYear, isToday } from "date-fns";

export function formatChatTimestamp(epochMs: number) {
  const date = new Date(epochMs);
  const now = new Date();

  if (isToday(date)) {
    return format(date, "p");
  }

  if (isSameYear(date, now)) {
    return format(date, "MMM d, p");
  }

  return format(date, "MMM d, yyyy, p");
}
