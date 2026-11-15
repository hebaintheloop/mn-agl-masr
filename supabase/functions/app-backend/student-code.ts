export function normalizeStudentCode(value: unknown): string {
  if (typeof value !== "string")
    throw new Error("كود الطالب يجب أن يكون 7 أرقام دون شرطات");
  const code = value
    .trim()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (!/^[0-9]{7}$/.test(code))
    throw new Error("كود الطالب يجب أن يكون 7 أرقام دون شرطات");
  return code;
}
