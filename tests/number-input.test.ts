import { describe, expect, it } from "vitest";
import { toAsciiDigits } from "../lib/number-input";

describe("phone keyboard numeric input", () => {
  it("normalizes both Arabic numeral sets while retaining leading zeros", () => {
    expect(toAsciiDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toAsciiDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(toAsciiDigits("٢٥۲٧٠۰١")).toBe("2527001");
  });
  it("preserves phone punctuation and normal input", () => {
    expect(toAsciiDigits("+٢٠ ١٠-١٢٣٤٥٦٧٨")).toBe("+20 10-12345678");
    expect(toAsciiDigits("0027001")).toBe("0027001");
    expect(toAsciiDigits("")).toBe("");
  });
});
