"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/features/chat/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatRoute = pathname?.startsWith("/app/c/");

  return (
    <div className="h-dvh w-full bg-muted/20">
      <div className="mx-auto flex h-dvh max-w-screen-2xl">
        <div className="flex h-dvh w-full overflow-hidden bg-background lg:rounded-2xl lg:border lg:shadow-sm">
        <AnimatePresence initial={false} mode="wait">
          <motion.aside
            key={isChatRoute ? "sidebar-hidden" : "sidebar"}
            className={cn(
              "h-dvh w-full border-r border-sidebar-border bg-sidebar lg:block lg:w-90",
              isChatRoute ? "hidden lg:block" : "block",
            )}
            initial={{ x: -18, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -18, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Sidebar />
          </motion.aside>
        </AnimatePresence>

        <AnimatePresence initial={false} mode="wait">
          <motion.main
            key={pathname ?? "main"}
            className={cn(
              "flex h-dvh flex-1 flex-col",
              isChatRoute ? "block" : "hidden lg:flex",
            )}
            initial={{ x: isChatRoute ? 18 : 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isChatRoute ? 18 : 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
