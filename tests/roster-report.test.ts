import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  filterRoster,
  makeRosterReport,
  type RosterRow,
  type RosterView,
} from "../lib/roster-report";
import { rosterWorkbook } from "../lib/roster-xlsx";

const event = {
  id: "event-fixture",
  title: "لقاء طلاب العلوم",
  start_at: "2026-11-17T08:00:00Z",
};
const person = (code: string, fields: Partial<RosterRow> = {}): RosterRow => ({
  user_id: code,
  going: true,
  present: false,
  excuse: "",
  accommodation: "",
  profiles: {
    full_name: "أحمد محمود",
    student_code: code,
    phone: "01012345678",
  },
  ...fields,
});
const rows = [
  person("2527001", { accommodation: "مقعد قريب من المدخل" }),
  person("2527002", { excuse: "سكشن الكيمياء من 10 إلى 12", present: true }),
  person("2527003", {
    accommodation: "تسهيل التنقل",
    excuse: "معمل الفيزياء",
    present: true,
  }),
  person("2527004", { going: false, excuse: "طلب ملغي" }),
  person("2527005", { accommodation: "   " }),
  person("0027006", {
    user_id: null,
    present: true,
    pending_account: true,
    registered_before: false,
    profiles: { full_name: "", student_code: "0027006", phone: "" },
  }),
];

describe("event request reports", () => {
  it("separates requests, preserves dual requests and excludes cancellations/blank requests", () => {
    expect(
      filterRoster(rows, "accommodations", "").map(
        (r) => r.profiles.student_code,
      ),
    ).toEqual(["2527001", "2527003"]);
    expect(
      filterRoster(rows, "excuses", "").map((r) => r.profiles.student_code),
    ).toEqual(["2527002", "2527003"]);
    expect(filterRoster(rows, "requests", "")).toHaveLength(3);
    expect(filterRoster(rows, "cancelled", "")).toEqual([rows[3]]);
    expect(filterRoster(rows, "accommodations", "٢٥٢٧٠٠٣")).toEqual([rows[2]]);
    expect(filterRoster(rows, "excuses", "احمد")).toHaveLength(2);
  });

  it("exports exactly the selected rows with view-specific columns and no national IDs", () => {
    for (const view of [
      "all",
      "waiting",
      "present",
      "accommodations",
      "excuses",
      "requests",
      "cancelled",
    ] as RosterView[]) {
      const selected = filterRoster(rows, view, "");
      const report = makeRosterReport(event, view, "", selected);
      expect(report.rows).toHaveLength(selected.length);
      expect(report.rows.every((r) => r.length === report.headers.length)).toBe(
        true,
      );
      expect(report.headers.join()).not.toContain("قومي");
    }
    const report = makeRosterReport(event, "accommodations", "٢٥٢٧٠٠١", [
      rows[0],
    ]);
    expect(report.rows[0]).toContain("مقبول تلقائيًا");
    expect(report.rows[0]).not.toContain("سكشن الكيمياء من 10 إلى 12");
  });

  it("writes a real RTL XLSX, preserves zero-prefixed identifiers and treats formulas as text", async () => {
    const risky = person("0027001", {
      accommodation: '=HYPERLINK("https://example.invalid")',
      profiles: {
        full_name: "=1+1",
        phone: "+201012345678",
        student_code: "0027001",
      },
    });
    const report = makeRosterReport(event, "accommodations", "", [risky]);
    const source = await rosterWorkbook(report);
    const bytes = await source.xlsx.writeBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    const sheet = workbook.worksheets[0];
    expect(sheet.views[0].rightToLeft).toBe(true);
    expect(sheet.getCell("B8").value).toBe("0027001");
    expect(sheet.getCell("C8").value).toBe("+201012345678");
    expect(sheet.getCell("A8").type).toBe(ExcelJS.ValueType.String);
    expect(sheet.getCell("D8").type).toBe(ExcelJS.ValueType.String);
    expect(sheet.getCell("D8").value).toBe(risky.accommodation);
    expect(sheet.getCell("A7").fill).toMatchObject({
      fgColor: { argb: "FFCE1126" },
    });
    expect(sheet.rowCount).toBe(8);
  });
});
