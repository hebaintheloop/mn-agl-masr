// Shared by the Next.js boundary and the authenticated backend gateway.
// Contact email is separate from the internal student-code login alias.
export function parseContactUpdate(input: unknown): {
  phone: string;
  email: string | null;
} {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid contact details");
  const value = input as Record<string, unknown>;
  if (
    value.action !== "profile" ||
    Object.keys(value).some(
      (key) => !["action", "phone", "email"].includes(key),
    )
  )
    throw new Error("Only phone number and email can be updated");
  if (typeof value.phone !== "string")
    throw new Error("Enter a valid phone number");
  const phone = value.phone.trim();
  if (!/^\+?[0-9\s-]{10,16}$/.test(phone))
    throw new Error("Enter a valid phone number");
  if (
    value.email !== undefined &&
    value.email !== null &&
    typeof value.email !== "string"
  )
    throw new Error("Enter a valid email address");
  const email = typeof value.email === "string" ? value.email.trim() : "";
  if (
    email &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    throw new Error("Enter a valid email address");
  return { phone, email: email || null };
}
