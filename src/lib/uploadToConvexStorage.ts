export type UploadResult = {
  storageId: string;
};

function isUploadResult(value: unknown): value is UploadResult {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { storageId?: unknown }).storageId === "string";
}

/**
 * Uploads a file to a Convex Storage upload URL.
 * Uses XHR to support upload progress.
 */
export function uploadToConvexStorage(
  uploadUrl: string,
  file: Blob,
  options?: {
    contentType?: string;
    onProgress?: (progress: { loaded: number; total: number; percent: number }) => void;
    signal?: AbortSignal;
  },
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const abortHandler = () => {
      try {
        xhr.abort();
      } catch {
        // ignore
      }
    };

    if (options?.signal) {
      if (options.signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      options.signal.addEventListener("abort", abortHandler, { once: true });
    }

    xhr.open("POST", uploadUrl);
    if (options?.contentType) {
      xhr.setRequestHeader("Content-Type", options.contentType);
    }

    xhr.upload.onprogress = (evt) => {
      if (!options?.onProgress) return;
      const total = evt.total ?? 0;
      const loaded = evt.loaded ?? 0;
      const percent = total > 0 ? Math.max(0, Math.min(100, (loaded / total) * 100)) : 0;
      options.onProgress({ loaded, total, percent });
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed"));
    };

    xhr.onload = () => {
      if (options?.signal) {
        options.signal.removeEventListener("abort", abortHandler);
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Upload failed (invalid JSON response)"));
        return;
      }

      if (!isUploadResult(parsed)) {
        reject(new Error("Upload failed (unexpected response)"));
        return;
      }

      resolve(parsed);
    };

    try {
      xhr.send(file);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Upload failed"));
    }
  });
}
