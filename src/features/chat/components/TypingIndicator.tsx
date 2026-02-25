"use client";

import { AnimatePresence, motion } from "framer-motion";

export function TypingIndicator({
  typing,
}: {
  typing: Array<{ userId: string; name: string }>;
}) {
  const first = typing[0];

  return (
    <AnimatePresence initial={false}>
      {first ? (
        <motion.div
          key="typing"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground"
        >
          <span className="truncate">
            {first.name}{typing.length > 1 ? ` +${typing.length - 1}` : ""} is
            typing
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
