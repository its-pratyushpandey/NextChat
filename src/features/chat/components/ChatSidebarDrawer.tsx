"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ChatSidebarDrawer({
  open,
  onOpenChange,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) return;
    const t = globalThis.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);
    return () => globalThis.clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <motion.button
            type="button"
            aria-label="Close chats"
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className={cn(
              "absolute left-0 top-0 h-dvh w-90 max-w-[90vw] overflow-hidden border-r border-sidebar-border bg-sidebar shadow-lg outline-none",
              "rounded-r-2xl",
              className,
            )}
            initial={{ x: -24, opacity: 0.98 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
