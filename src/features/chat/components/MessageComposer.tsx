"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Mic,
  Paperclip,
  SendHorizontal,
  Smile,
  Square,
  X,
} from "lucide-react";
import { gsap } from "gsap";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import { uploadToConvexStorage } from "@/lib/uploadToConvexStorage";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function isAllowedGeneralMimeType(mimeType: string): boolean {
  const t = mimeType.toLowerCase();
  if (t.startsWith("image/")) return true;
  if (t.startsWith("video/")) return true;
  if (t.startsWith("audio/")) return true;
  if (t === "application/pdf") return true;
  if (t === "text/plain") return true;
  if (t === "application/msword") return true;
  if (t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return true;
  if (t === "application/vnd.ms-powerpoint") return true;
  if (t === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return true;
  if (t === "application/vnd.ms-excel") return true;
  if (t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return true;
  return false;
}

function formatDurationMs(durationMs: number): string {
  const total = Math.max(0, Math.floor(durationMs / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

const COMPOSER_EMOJIS = [
  "😀",
  "😁",
  "😄",
  "😅",
  "😂",
  "🥲",
  "😊",
  "😍",
  "😘",
  "😎",
  "🤔",
  "😴",
  "🙌",
  "👍",
  "🙏",
  "🎉",
  "🔥",
  "⚡",
  "❤️",
  "✨",
] as const;

export function MessageComposer({
  conversationId,
  disabled,
}: {
  conversationId: Id<"conversations">;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  const [upload, setUpload] = useState<
    | null
    | {
        kind: "file" | "voice";
        name: string;
        percent: number;
      }
  >(null);

  const [isDragActive, setIsDragActive] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);

  const send = useMutation(api.messages.send);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const sendFile = useMutation(api.messages.sendFile);
  const sendVoice = useMutation(api.messages.sendVoice);
  const pingTyping = useMutation(api.typing.ping);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingCancelledRef = useRef<boolean>(false);

  const isBusy = !!disabled || sending || upload !== null || isRecording;
  const canSend = body.trim().length > 0 && !isBusy;
  const charCount = body.length;

  useEffect(() => {
    const btn = document.querySelector('[data-gsap="send-button"]');
    if (!btn) return;
    const el = btn as HTMLElement;
    const onEnter = () => gsap.to(el, { scale: 1.02, duration: 0.12, ease: "power2.out" });
    const onLeave = () => gsap.to(el, { scale: 1, duration: 0.12, ease: "power2.out" });
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const typingPing = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (timeout) globalThis.clearTimeout(timeout);
      void pingTyping({ conversationId });
      timeout = globalThis.setTimeout(() => {
        timeout = null;
      }, 450);
    };
  }, [conversationId, pingTyping]);

  useEffect(() => {
    if (!isRecording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void cancelRecording();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      // Best-effort cleanup.
      uploadAbortRef.current?.abort();
      const r = mediaRecorderRef.current;
      if (r && r.state !== "inactive") {
        try {
          r.stop();
        } catch {
          // ignore
        }
      }
      const stream = mediaStreamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  async function uploadAndSendFile(file: File) {
    setComposerError(null);

    if (file.size <= 0) throw new Error("Empty file");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("Max file size is 20MB");
    const mimeType = (file.type || "application/octet-stream").toLowerCase();
    if (!isAllowedGeneralMimeType(mimeType)) throw new Error("Unsupported file type");

    setUpload({ kind: "file", name: file.name, percent: 0 });
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      const uploadUrl = await generateUploadUrl({ conversationId });
      const { storageId } = await uploadToConvexStorage(uploadUrl, file, {
        contentType: file.type || "application/octet-stream",
        signal: controller.signal,
        onProgress: ({ percent }) =>
          setUpload((prev) =>
            prev ? { ...prev, percent: Math.round(percent) } : prev,
          ),
      });

      await sendFile({
        conversationId,
        file: {
          storageId: storageId as Id<"_storage">,
          fileName: file.name,
          fileSize: file.size,
          mimeType: mimeType,
        },
      });
    } finally {
      uploadAbortRef.current = null;
      setUpload(null);
    }
  }

  async function handleSelectedFiles(files: File[]) {
    if (!files.length) return;
    if (disabled || sending || upload !== null || isRecording) return;

    setComposerError(null);

    for (const file of files) {
      try {
        await uploadAndSendFile(file);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setComposerError(msg);
        break;
      }
    }
  }

  async function startRecording() {
    if (disabled || sending || upload !== null) return;
    if (isRecording) return;

    setComposerError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setComposerError("Microphone recording not supported in this browser");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setComposerError("Microphone recording not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Prefer a common, efficient codec if supported.
      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];

      const mimeType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recordingChunksRef.current = [];
      recordingCancelledRef.current = false;
      recordingStartedAtRef.current = Date.now();
      setRecordingMs(0);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
      const cancelled = recordingCancelledRef.current;

      const streamNow = mediaStreamRef.current;
      if (streamNow) {
        for (const track of streamNow.getTracks()) track.stop();
      }
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;

      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (cancelled) {
        recordingChunksRef.current = [];
        return;
      }

      const duration = Math.max(1, Date.now() - recordingStartedAtRef.current);
      const blob = new Blob(recordingChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });

      recordingChunksRef.current = [];

      void (async () => {
        if (blob.size <= 0) {
          setComposerError("Recording failed");
          return;
        }
        if (blob.size > MAX_UPLOAD_BYTES) {
          setComposerError("Voice message is too large (20MB max)");
          return;
        }

        setUpload({ kind: "voice", name: "Voice message", percent: 0 });
        const controller = new AbortController();
        uploadAbortRef.current = controller;

        try {
          const uploadUrl = await generateUploadUrl({ conversationId });
          const { storageId } = await uploadToConvexStorage(uploadUrl, blob, {
            contentType: blob.type || "audio/webm",
            signal: controller.signal,
            onProgress: ({ percent }) =>
              setUpload((prev) =>
                prev ? { ...prev, percent: Math.round(percent) } : prev,
              ),
          });

          await sendVoice({
            conversationId,
            voice: {
              storageId: storageId as Id<"_storage">,
              durationMs: duration,
              mimeType: (blob.type || "audio/webm").toLowerCase(),
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          setComposerError(msg);
        } finally {
          uploadAbortRef.current = null;
          setUpload(null);
        }
      })();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingMs(Date.now() - recordingStartedAtRef.current);
      }, 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone permission denied";
      setComposerError(msg);
      const stream = mediaStreamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
    }
  }

  async function stopRecording() {
    const r = mediaRecorderRef.current;
    if (!r) return;
    if (r.state === "inactive") return;
    try {
      r.stop();
    } finally {
      setIsRecording(false);
    }
  }

  async function cancelRecording() {
    recordingCancelledRef.current = true;
    const r = mediaRecorderRef.current;
    if (r && r.state !== "inactive") {
      try {
        r.stop();
      } catch {
        // ignore
      }
    }

    const stream = mediaStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }

    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;

    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setRecordingMs(0);
  }

  async function onSend() {
    if (!canSend) return;

    const text = body;
    setBody("");
    setSending(true);
    setLastFailed(null);

    try {
      await send({ conversationId, body: text });

      const el = document.querySelector('[data-gsap="composer-send"]');
      if (el) {
        gsap.fromTo(
          el,
          { scale: 0.95 },
          { scale: 1, duration: 0.18, ease: "power2.out" },
        );
      }
    } catch {
      setBody(text);
      setLastFailed(text);
    } finally {
      setSending(false);
    }
  }

  async function onRetry() {
    if (!lastFailed || sending || disabled) return;
    setBody(lastFailed);
    setLastFailed(null);
    await onSend();
  }

  return (
    <div className="space-y-2">
      {lastFailed ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
          <span className="truncate">Failed to send. Check connection and retry.</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => void onRetry()}>
            Retry
          </Button>
        </div>
      ) : null}

      {composerError ? (
        <div className="rounded-lg border bg-background px-3 py-2 text-xs text-destructive">
          {composerError}
        </div>
      ) : null}

      <div
        className={
          "flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm" +
          (isDragActive ? " ring-2 ring-primary/20" : "")
        }
        data-gsap="composer-send"
        onDragOver={(e) => {
          e.preventDefault();
          if (disabled || sending || upload !== null || isRecording) return;
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          const files = Array.from(e.dataTransfer.files ?? []);
          void handleSelectedFiles(files);
        }}
      >
        <div className="flex flex-col items-center gap-1 pb-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-2xl"
                disabled={disabled}
                aria-label="Open emoji picker"
              >
                <Smile className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="grid grid-cols-10 gap-1 p-1">
                {COMPOSER_EMOJIS.map((emoji) => (
                  <DropdownMenuItem
                    key={emoji}
                    className="h-8 w-8 justify-center rounded-md p-0"
                    onClick={() => {
                      setBody((prev) => (prev ? `${prev} ${emoji}` : emoji));
                      typingPing();
                    }}
                  >
                    <span className="text-base leading-none">{emoji}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-2xl"
            disabled={disabled || sending || upload !== null || isRecording}
            aria-label="Attach file"
            onClick={() => fileInputRef.current?.click()}
          >
            {upload?.kind === "file" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Paperclip className="size-4" />
            )}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.currentTarget.value = "";
            void handleSelectedFiles(files);
          }}
        />

        {isRecording ? (
          <div className="flex min-h-11 flex-1 items-center gap-2 px-2 py-2">
            <motion.span
              className="inline-block h-2.5 w-2.5 rounded-full bg-destructive"
              animate={{ scale: [1, 1.35, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="text-sm">Recording</span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatDurationMs(recordingMs)}
            </span>
            <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
              Esc to cancel
            </span>
          </div>
        ) : (
          <Textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              typingPing();
            }}
            placeholder="Message…"
            className="min-h-11 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
            disabled={disabled}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData?.files ?? []);
              const images = files.filter((f) => f.type.startsWith("image/"));
              if (images.length) {
                e.preventDefault();
                void handleSelectedFiles(images);
              }
            }}
            onKeyDown={(e) => {
              if (upload !== null || disabled || sending) return;
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void onSend();
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
          />
        )}

        <div className="flex flex-col items-center gap-1 pb-1">
          <AnimatePresence initial={false}>
            {isRecording ? (
              <motion.div
                key="cancel"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-2xl"
                  onClick={() => void cancelRecording()}
                  aria-label="Cancel recording"
                >
                  <X className="size-4" />
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-2xl"
            disabled={disabled || sending || upload !== null}
            aria-label={isRecording ? "Stop recording" : "Record voice message"}
            onClick={() => {
              if (isRecording) {
                void stopRecording();
              } else {
                void startRecording();
              }
            }}
          >
            {isRecording ? (
              <motion.span
                className="inline-flex"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
              >
                <Square className="size-4 text-destructive" />
              </motion.span>
            ) : upload?.kind === "voice" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mic className="size-4" />
            )}
          </Button>

          <Button
            onClick={onSend}
            disabled={!canSend}
            size="icon"
            className="shrink-0 rounded-2xl"
            data-gsap="send-button"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {upload ? (
        <div className="px-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate">
              Uploading {upload.kind === "voice" ? "voice message" : upload.name}
            </span>
            <span className="tabular-nums">{upload.percent}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${upload.percent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>Enter to send • Shift+Enter newline</span>
        <span suppressHydrationWarning>{charCount}</span>
      </div>
    </div>
  );
}
