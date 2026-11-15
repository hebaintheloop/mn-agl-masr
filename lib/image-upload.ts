import type { LeaderApi } from "@/components/leader-attendance";
export async function prepareImage(file: File): Promise<Blob> {
  if (file.size > 15 * 1024 * 1024)
    throw new Error("الصورة كبيرة. اختار صورة أقل من 15 ميجا.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!jpg && !png && !webp) throw new Error("اختار صورة JPG أو PNG أو WebP.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (
      !img.naturalWidth ||
      !img.naturalHeight ||
      img.naturalWidth * img.naturalHeight > 50000000
    )
      throw new Error("اختار صورة أصغر شوية.");
    const scale = Math.min(
      1,
      1600 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("المتصفح مش قادر يجهّز الصورة.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("الصورة مش راضية تفتح. جرّب صورة تانية.")),
          "image/jpeg",
          quality,
        ),
      );
      if (blob.size <= 2 * 1024 * 1024) return blob;
    }
    throw new Error("الصورة لسه كبيرة. اختار صورة أصغر.");
  } catch (e) {
    throw e instanceof Error
      ? e
      : new Error("الصورة مش راضية تفتح. جرّب صورة تانية.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function uploadImage(
  file: File,
  purpose: "event" | "home",
  api: LeaderApi,
) {
  const blob = await prepareImage(file);
  const result = await api("image-upload", { purpose });
  const upload = new URL(result.upload_url);
  const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  if (
    upload.origin !== base.origin ||
    !upload.pathname.startsWith("/storage/v1/object/upload/sign/")
  )
    throw new Error("رابط الرفع مش مظبوط.");
  const body = new FormData();
  body.append("cacheControl", "31536000");
  body.append("", blob, "image.jpg");
  const r = await fetch(upload.href, {
    method: "PUT",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      "x-upsert": "false",
    },
    body,
  });
  if (!r.ok) throw new Error("الصورة ماترفعتش. جرّب تاني، أو اختار صورة أصغر.");
  return { url: result.asset_url as string, blob };
}
