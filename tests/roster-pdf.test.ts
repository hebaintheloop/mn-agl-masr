import { afterEach, expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { rosterPdf } from "../lib/roster-pdf";
import { makeRosterReport, type RosterRow } from "../lib/roster-report";

afterEach(() => vi.unstubAllGlobals());

it("creates a multi-page Arabic PDF table with an embedded font and LTR identifiers", async () => {
  const bytes = readFileSync("public/assets/Amiri-Regular.ttf");
  vi.stubGlobal("fetch", async () => new Response(bytes));
  const rows: RosterRow[] = Array.from({ length: 60 }, (_, i) => ({
    user_id: String(i),
    going: true,
    present: i % 2 === 0,
    accommodation:
      "محتاج مقعد قريب من المدخل ومساحة للحركة بسهولة.\nالطلب يخص الفعالية دي بس.",
    excuse: "",
    profiles: {
      full_name: "أحمد محمد عبد الرحمن",
      student_code: `0027${String(i).padStart(3, "0")}`,
      phone: "01012345678",
    },
  }));
  const doc = await rosterPdf(
    makeRosterReport(
      {
        id: "test-event",
        title: "لقاء طلاب من أجل مصر بكلية العلوم، جامعة القاهرة",
        start_at: "2026-11-17T08:00:00Z",
      },
      "accommodations",
      "",
      rows,
    ),
  );
  expect(doc.getNumberOfPages()).toBeGreaterThan(2);
  const pdf = new Uint8Array(doc.output("arraybuffer"));
  expect(new TextDecoder().decode(pdf.subarray(0, 5))).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(10000);
  writeFileSync("/workspace/work/roster-report-sample.pdf", pdf);
});
