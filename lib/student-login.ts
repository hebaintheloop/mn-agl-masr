import type { SupabaseClient } from "@supabase/supabase-js";

/** Existing managed Auth aliases remain valid after removing display-code separators. */
export async function signInStudent(
  auth: Pick<SupabaseClient["auth"], "signInWithPassword">,
  code: string,
  password: string,
  allowLegacy = true,
) {
  const result = await auth.signInWithPassword({
    email: code + "@members.mnagl.invalid",
    password,
  });
  if (!result.error || !allowLegacy) return result;
  const legacyCode = `${code.slice(0, 2)}-${code.slice(2, 4)}-${code.slice(4)}`;
  return auth.signInWithPassword({
    email: legacyCode + "@members.mnagl.invalid",
    password,
  });
}
