const pathPattern = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/i;
export function privateImagePath(value: unknown, base: string): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const root = new URL(base);
    const prefix = "/storage/v1/object/public/event-images/";
    if (url.origin !== root.origin || !url.pathname.startsWith(prefix))
      return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    return pathPattern.test(path) ? path : null;
  } catch {
    return null;
  }
}
export async function issueImageUpload(
  db: any,
  userId: string,
  purpose: unknown,
) {
  if (purpose !== "event" && purpose !== "home")
    throw new Error("اختار مكان الصورة الأول");
  const bucket = purpose === "event" ? "event-images" : "site-images";
  const path = userId + "/" + crypto.randomUUID() + ".jpg";
  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.signedUrl)
    throw new Error("مش قادرين نبدأ رفع الصورة دلوقتي. جرّب تاني.");
  return {
    upload_url: data.signedUrl,
    asset_url: db.storage.from(bucket).getPublicUrl(path).data.publicUrl,
  };
}
export async function imagePreview(db: any, url: unknown, base: string) {
  const path = privateImagePath(url, base);
  if (!path) throw new Error("رابط الصورة مش مظبوط");
  const { data, error } = await db.storage
    .from("event-images")
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl)
    throw new Error("مش قادرين نعرض الصورة دلوقتي");
  return { url: data.signedUrl };
}
export async function eventImages(db: any, events: any[], base: string) {
  const paths = [
    ...new Set(
      events.map((e) => privateImagePath(e.cover_url, base)).filter(Boolean),
    ),
  ] as string[];
  if (!paths.length) return events;
  const { data, error } = await db.storage
    .from("event-images")
    .createSignedUrls(paths, 3600);
  const urls = new Map<string, string>(
    (error ? [] : data || [])
      .filter((x: any) => x.path && x.signedUrl && !x.error)
      .map((x: any) => [x.path, x.signedUrl]),
  );
  return events.map((e) => {
    const path = privateImagePath(e.cover_url, base);
    return path ? { ...e, cover_url: urls.get(path) || null } : e;
  });
}
