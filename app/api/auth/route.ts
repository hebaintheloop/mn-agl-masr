import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authClient } from "@/lib/supabase";
import { signInStudent } from "@/lib/student-login";
import { backend } from "@/lib/backend";
import { encryptIdentity, hash, recoveryCode } from "@/lib/security";
export async function POST(req: NextRequest) {
  try {
    if (
      !req.headers.get("origin") ||
      new URL(req.headers.get("origin")!).host !== req.headers.get("host")
    )
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const b = await req.json();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    const rate = await backend("rate", {
      key: hash(process.env.RATE_LIMIT_SALT + ip + b.action),
      limit: 300,
      seconds: 300,
    });
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Please wait before trying again" },
        { status: 429 },
      );
    const client = await authClient();
    if (b.action === "logout") {
      await client.auth.signOut();
      return NextResponse.json({ ok: true });
    }
    const code = z
      .string()
      .regex(/^\d{7}$/)
      .parse(b.student_code);
    const password = z.string().min(12).max(128).parse(b.password);
    const accountRate = await backend("rate", {
      key: hash(process.env.RATE_LIMIT_SALT + code + b.action),
      limit: 10,
      seconds: 300,
    });
    if (!accountRate.allowed)
      return NextResponse.json(
        { error: "Please wait before trying this account again" },
        { status: 429 },
      );
    let recovery;
    if (b.action === "recover") {
      const provided = z.string().min(20).max(100).parse(b.recovery_code);
      recovery = recoveryCode();
      await backend("recover", {
        student_code: code,
        password,
        recovery_hash: hash(provided),
        new_recovery_hash: hash(recovery),
      });
    }
    if (b.action === "signup") {
      const p = z
        .object({
          full_name: z.string().trim().min(2).max(100),
          phone: z.string().regex(/^\+?[0-9\s-]{10,16}$/),
          national_id: z.string().regex(/^\d{14}$/),
          year: z.enum(["first", "second", "third", "fourth"]),
        })
        .parse(b);
      recovery = recoveryCode();
      await backend("signup", {
        student_code: code,
        password,
        full_name: p.full_name,
        phone: p.phone,
        year: p.year,
        ciphertext: encryptIdentity(p.national_id),
        recovery_hash: hash(recovery),
      });
    }
    const { error } = await signInStudent(
      client.auth,
      code,
      password,
      b.action !== "signup",
    );
    if (error)
      return NextResponse.json(
        { error: "Check your student code and password" },
        { status: 401 },
      );
    return NextResponse.json(
      { ok: true, recovery },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Check your details. Passwords need at least 12 characters; national IDs need 14 digits. The student code may already be registered.",
      },
      { status: 400 },
    );
  }
}
