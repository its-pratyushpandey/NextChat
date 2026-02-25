"use client";

import { cn } from "@/lib/utils";

export function CheckboxRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
        checked && "bg-accent",
      )}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "size-4 rounded border",
          checked ? "bg-primary" : "bg-background",
        )}
      />
    </button>
  );
}
