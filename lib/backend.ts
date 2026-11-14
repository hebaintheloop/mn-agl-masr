export class BackendError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function backend(
  action: string,
  data: Record<string, unknown> = {},
  token?: string,
) {
  const res = await fetch(
    process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/app-backend",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Key": process.env.APP_BACKEND_SECRET!,
        "x-region": "eu-west-1",
        ...(token ? { "X-User-Token": token } : {}),
      },
      body: JSON.stringify({ action, ...data }),
      cache: "no-store",
    },
  );
  const result = await res.json();
  if (!res.ok)
    throw new BackendError(result.error || "Request failed", res.status);
  return result;
}
