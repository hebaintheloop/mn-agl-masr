export function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
    return String(arabic >= 0 ? arabic : "۰۱۲۳۴۵۶۷۸۹".indexOf(digit));
  });
}
