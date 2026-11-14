import { NextRequest, NextResponse } from "next/server";
import { authClient } from "@/lib/supabase";
import { backend, BackendError } from "@/lib/backend";
import { z } from "zod";
import { hash, encryptIdentity } from "@/lib/security";
export async function GET() {
  try {
    return NextResponse.json(await backend("public"), {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load events" },
      { status: 503 },
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    if (
      !req.headers.get("origin") ||
      new URL(req.headers.get("origin")!).host !== req.headers.get("host")
    )
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const b = await req.json();
    const allowed = [
      "me",
      "leaderboard",
      "rsvp",
      "scan",
      "identity",
      "create-event",
      "attendees",
      "manual",
      "news",
      "home",
    ];
    if (!allowed.includes(b.action))
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    if (b.action === "create-event") {
      const ev = z
        .object({
          title: z.string().trim().min(2).max(200),
          description: z.string().max(5000),
          location: z.string().trim().min(2).max(300),
          start_at: z.iso.datetime(),
          end_at: z.iso.datetime(),
          points: z.number().int().min(0).max(10000),
          cover_url: z
            .union([z.literal(""), z.url().startsWith("https://")])
            .optional(),
        })
        .parse(b);
      if (new Date(ev.end_at) <= new Date(ev.start_at))
        throw new Error("End time must be after start time");
    }
    if (b.action === "news")
      z.object({
        title: z.string().trim().min(2).max(200),
        body: z.string().trim().min(2).max(5000),
      }).parse(b);
    if (b.action === "home") {
      b.home = z
        .object({
          video_url: z.union([z.literal(""), z.url().startsWith("https://")]),
          poster_url: z.union([z.literal(""), z.url().startsWith("https://")]),
          gallery_urls: z.array(z.url().startsWith("https://")).max(12),
        })
        .parse(b.home);
    }
    const client = await authClient();
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session)
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    b._rate = { key: hash(session.user.id + b.action), limit: 90, seconds: 60 };
    if (b.action === "identity") {
      if (!/^\d{14}$/.test(b.national_id))
        throw new Error("National ID must be 14 digits");
      b.ciphertext = encryptIdentity(b.national_id);
      delete b.national_id;
    }
    return NextResponse.json(await backend(b.action, b, session.access_token), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      {
        status: e instanceof BackendError ? e.status : 400,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
