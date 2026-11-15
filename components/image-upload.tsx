"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Upload, LoaderCircle } from "lucide-react";
import type { LeaderApi } from "./leader-attendance";
import { uiError } from "@/lib/ui-error";
import { uploadImage } from "@/lib/image-upload";
import "./image-upload.css";
export function ImageUpload({
  api,
  purpose,
  onUploaded,
  onBusyChange,
  label = "ارفع صورة",
  multiple = false,
  maxFiles = 1,
  disabled = false,
}: {
  api: LeaderApi;
  purpose: "event" | "home";
  onUploaded: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
  label?: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null),
    running = useRef(false),
    alive = useRef(true);
  const id = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      onBusyChange?.(false);
    };
  }, []);
  async function choose(files: FileList | null) {
    if (!files?.length || running.current) return;
    if (files.length > maxFiles) {
      setError(
        maxFiles === 1
          ? "اختار صورة واحدة."
          : `تقدر تضيف لحد ${maxFiles} صور كمان.`,
      );
      if (input.current) input.current.value = "";
      return;
    }
    running.current = true;
    setBusy(true);
    setError("");
    onBusyChange?.(true);
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(
          files.length === 1
            ? "بنرفع الصورة…"
            : `بنرفع صورة ${i + 1} من ${files.length}…`,
        );
        const uploaded = await uploadImage(files[i], purpose, api);
        if (!alive.current) return;
        onUploaded(uploaded.url);
      }
    } catch (e) {
      if (alive.current)
        setError(uiError(e instanceof Error ? e.message : null));
    } finally {
      running.current = false;
      if (alive.current) {
        setBusy(false);
        setProgress("");
        if (input.current) input.current.value = "";
        onBusyChange?.(false);
      }
    }
  }
  return (
    <div className="image-upload">
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        hidden
        onChange={(e) => choose(e.target.files)}
      />
      <button
        type="button"
        className="outline"
        disabled={busy || disabled || maxFiles < 1}
        aria-controls={id}
        onClick={() => input.current?.click()}
      >
        {busy ? (
          <LoaderCircle size={17} className="spin" />
        ) : (
          <Upload size={17} />
        )}{" "}
        {busy ? "بنرفع الصورة…" : label}
      </button>
      {busy && <span role="status">{progress}</span>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function ImagePreview({ url, api }: { url: string; api: LeaderApi }) {
  const [preview, setPreview] = useState({ asset: "", src: "", failed: false });
  const privateAsset = url.includes("/storage/v1/object/public/event-images/");
  useEffect(() => {
    let active = true;
    if (privateAsset)
      api("image-read", { url })
        .then((d) => {
          if (active) setPreview({ asset: url, src: d.url, failed: false });
        })
        .catch(() => {
          if (active) setPreview({ asset: url, src: "", failed: true });
        });
    return () => {
      active = false;
    };
  }, [url, api, privateAsset]);
  if (!url) return null;
  if (privateAsset && preview.asset !== url)
    return <p role="status">بنجهّز المعاينة…</p>;
  if (privateAsset && preview.failed)
    return (
      <p className="leader-help">
        مش قادرين نعرض الصورة دلوقتي. الرابط لسه محفوظ.
      </p>
    );
  return (
    <img
      className="image-upload-preview"
      src={privateAsset ? preview.src : url}
      alt="معاينة الصورة"
    />
  );
}
