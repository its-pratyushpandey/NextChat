"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getDeterministicColor,
  getShortId,
  getUserAvatarUrl,
} from "@/lib/userPresentation";
import { getInitials } from "@/features/chat/lib/initials";

export function UserAvatar({
  userId,
  name,
  imageUrl,
  size,
  isOnline,
  statusBorderClassName,
  className,
  priority,
}: {
  userId: string;
  name: string;
  imageUrl?: string | null;
  size: number;
  isOnline?: boolean;
  statusBorderClassName?: string;
  className?: string;
  priority?: boolean;
}) {
  const [broken, setBroken] = useState(false);

  const src = useMemo(() => {
    const trimmed = (imageUrl ?? "").trim();
    if (trimmed) return trimmed;
    return getUserAvatarUrl(userId);
  }, [imageUrl, userId]);

  const initials = useMemo(() => {
    const i = getInitials((name ?? "").trim());
    if (i) return i;
    return getShortId(userId).slice(0, 2);
  }, [name, userId]);

  const dotSize = Math.max(8, Math.round(size * 0.28));
  const dotOffset = Math.max(1, Math.round(size * 0.06));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={cn(
        "group relative shrink-0",
        "rounded-full",
        "transition-transform duration-150 ease-out hover:scale-[1.03]",
        "hover:ring-2 hover:ring-ring/35",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {!broken ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="size-full rounded-full object-cover"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          className={cn(
            "flex size-full items-center justify-center rounded-full text-xs font-semibold",
            getDeterministicColor(userId),
          )}
          aria-hidden="true"
        >
          {initials}
        </div>
      )}

      {typeof isOnline === "boolean" ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute rounded-full border-2",
            statusBorderClassName ?? "border-background",
            isOnline ? "bg-emerald-500" : "bg-muted",
          )}
          style={{
            width: dotSize,
            height: dotSize,
            right: -dotOffset,
            bottom: -dotOffset,
          }}
        />
      ) : null}
    </motion.div>
  );
}
