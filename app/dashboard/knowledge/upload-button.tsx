"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createUploadUrl, ingestUploadedDoc } from "./actions";

export function UploadButton({ botId }: { botId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("bot_id", botId);
      fd.append("file_name", file.name);
      const { token, path } = await createUploadUrl(fd);

      const supabase = createClient();
      const { error } = await supabase.storage
        .from("bot-documents")
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (error) throw error;

      const ingestFd = new FormData();
      ingestFd.append("bot_id", botId);
      ingestFd.append("file_name", file.name);
      ingestFd.append("storage_path", path);
      ingestFd.append("mime_type", file.type || "application/octet-stream");
      await ingestUploadedDoc(ingestFd);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label
        className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {busy ? "Uploading..." : "Upload"}
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={onChange}
          accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
          disabled={busy}
        />
      </label>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}
