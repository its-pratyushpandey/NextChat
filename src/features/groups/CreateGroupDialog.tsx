"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckboxRow } from "@/features/groups/CheckboxRow";
import { useRouter } from "next/navigation";
import { getUserDisplayName } from "@/lib/userPresentation";

export function CreateGroupDialog() {
  const router = useRouter();
  const people = useQuery(api.users.listForDiscovery, { limit: 50 });
  const createGroup = useMutation(api.conversations.createGroup);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  async function onCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const memberUserIds = selectedIds as Id<"users">[];
    const result = await createGroup({ name: trimmed, memberUserIds });
    setOpen(false);
    setName("");
    setSelected({});
    router.push(`/app/c/${result.conversationId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          New group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="rounded-lg border">
            <ScrollArea className="h-56">
              <div className="p-2">
                {people === undefined ? (
                  <p className="p-2 text-sm text-muted-foreground">Loading…</p>
                ) : people.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    No other users found.
                  </p>
                ) : (
                  people.map((u) => (
                    <CheckboxRow
                      key={String(u._id)}
                      label={getUserDisplayName({
                        id: String(u._id),
                        username: u.name,
                        email: u.email ?? null,
                      })}
                      checked={!!selected[String(u._id)]}
                      onCheckedChange={(checked) =>
                        setSelected((s) => ({
                          ...s,
                          [String(u._id)]: checked,
                        }))
                      }
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <Button
            className="w-full"
            disabled={!name.trim() || selectedIds.length === 0}
            onClick={onCreate}
          >
            Create ({selectedIds.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
