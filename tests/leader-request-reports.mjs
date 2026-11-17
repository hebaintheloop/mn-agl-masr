import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { writeFile } from "node:fs/promises";
const base = process.env.UI_TEST_BASE_URL || "http://localhost:4501";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  proxy:
    base.startsWith("https:") && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  acceptDownloads: true,
  viewport: { width: 1365, height: 950 },
});
const p = await context.newPage();
const errors = [],
  fontRequests = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("request", (r) => {
  if (r.url().includes("Amiri-Regular.ttf")) fontRequests.push(r.url());
});
let role = "leader";
const event = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "لقاء طلاب العلوم",
  description: "لقاء الأسرة",
  location: "كلية العلوم",
  start_at: new Date(Date.now() - 600000).toISOString(),
  end_at: new Date(Date.now() + 3600000).toISOString(),
  points: 20,
  cover_url: null,
};
const row = (id, name, code, fields = {}) => ({
  user_id: id,
  going: true,
  present: false,
  excuse: "",
  accommodation: "",
  profiles: { full_name: name, student_code: code, phone: "01012345678" },
  ...fields,
});
const rows = [
  row("one", "أحمد محمود", "0027001", {
    accommodation: "مقعد قريب من المدخل\nومساحة للحركة",
  }),
  row("two", "مريم أحمد", "2527002", {
    excuse: "سكشن الكيمياء من 10 إلى 12",
    present: true,
  }),
  row("three", "سلمى محمد", "2527003", {
    accommodation: "تسهيل التنقل",
    excuse: "معمل الفيزياء",
    present: true,
  }),
  row("four", "طالب ألغى", "2527004", {
    going: false,
    accommodation: "تسهيل ملغي",
    excuse: "عذر ملغي",
  }),
  row("five", "طالب من غير طلبات", "2527005"),
  row(null, "", "0027006", {
    present: true,
    pending_account: true,
    registered_before: false,
    points: 20,
  }),
];
await p.route("**/api/action*", async (route) => {
  const req = route.request();
  if (req.method() === "GET")
    return route.fulfill({ json: { events: [], news: [], home: {} } });
  const b = req.postDataJSON();
  if (b.action === "me")
    return route.fulfill({
      json: {
        profile: {
          id: "fixture-leader",
          role,
          full_name: "قائد للمعاينة",
          student_code: "0000000",
          phone: "00000000000",
        },
        registrations: [],
        points: [],
      },
    });
  if (b.action === "events")
    return route.fulfill({ json: { events: [event] } });
  if (b.action === "event") return route.fulfill({ json: { event } });
  if (b.action === "attendees")
    return route.fulfill({ json: { rows, attendance: [] } });
  return route.fulfill({
    status: 400,
    json: { error: "Fixture unexpected action" },
  });
});
await p.goto(base);
await p.getByRole("heading", { name: "آخر أخبارنا", exact: true }).waitFor();
await p.waitForFunction(
  () =>
    [...document.querySelectorAll(".hiss-image-layer img")].length === 9 &&
    [...document.querySelectorAll(".hiss-image-layer img")].every(
      (i) => i.complete && i.naturalWidth > 0,
    ),
);
const photos = await p
  .locator(".hiss-image-layer img")
  .evaluateAll((imgs) =>
    [...new Set(imgs.map((i) => new URL(i.src).pathname))].sort(),
  );
assert.deepEqual(photos, [
  "/assets/homepage-1.jpg",
  "/assets/homepage-2.jpg",
  "/assets/homepage-3.jpg",
]);
assert.equal(fontRequests.length, 0, "PDF font must not load on homepage");
await p.goto(base + "/?event=" + event.id + "&manage=1");
await p.getByText("أحمد محمود", { exact: true }).waitFor();
const accommodation = p.getByRole("button", {
  name: "التسهيلات (2)",
  exact: true,
});
const excuses = p.getByRole("button", {
  name: "الأعذار الأكاديمية (2)",
  exact: true,
});
await accommodation.click();
await p.getByRole("heading", { name: "التسهيلات", exact: true }).waitFor();
assert.equal(await p.locator(".request-table tbody tr").count(), 2);
assert(
  await p
    .getByText("مقعد قريب من المدخل\nومساحة للحركة", { exact: true })
    .isVisible(),
);
assert.equal(
  await p
    .locator(".request-table")
    .getByText("طالب ألغى", { exact: true })
    .count(),
  0,
);
assert.equal(await p.locator(".request-table details").count(), 0);
await p.screenshot({
  path: "/workspace/work/leader-accommodations-desktop.png",
  fullPage: true,
});
async function download(format) {
  const promise = p.waitForEvent("download");
  await p
    .getByRole("button", {
      name: "تنزيل " + (format === "xlsx" ? "Excel" : "PDF"),
      exact: true,
    })
    .click();
  const d = await promise;
  const stream = await d.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  assert(d.suggestedFilename().endsWith("." + format));
  await p.waitForFunction(
    () =>
      ![...document.querySelectorAll(".roster-downloads button")].some(
        (b) => b.disabled,
      ),
  );
  return { bytes, name: d.suggestedFilename() };
}
await p
  .getByRole("textbox", { name: "ابحث عن مشارك", exact: true })
  .fill("٠٠٢٧٠٠١");
assert.equal(await p.locator(".request-table tbody tr").count(), 1);
let result = await download("xlsx");
assert(result.name.includes("accommodations"));
let workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(result.bytes);
let sheet = workbook.worksheets[0];
assert.equal(sheet.views[0].rightToLeft, true);
assert.equal(sheet.rowCount, 8);
assert.equal(sheet.getCell("B8").value, "0027001");
assert.equal(sheet.getCell("C8").value, "01012345678");
assert.equal(sheet.getCell("D8").value, rows[0].accommodation);
assert(!JSON.stringify(sheet.getSheetValues()).includes("سلمى محمد"));
result = await download("pdf");
assert.equal(result.bytes.subarray(0, 5).toString(), "%PDF-");
await writeFile("/workspace/work/leader-accommodations.pdf", result.bytes);
assert.equal(fontRequests.length, 1);
await p.getByRole("button", { name: "مسح البحث", exact: true }).click();
await excuses.click();
await p
  .getByRole("heading", { name: "الأعذار الأكاديمية", exact: true })
  .waitFor();
assert.equal(await p.locator(".request-table tbody tr").count(), 2);
await p
  .locator(".request-table")
  .getByText("سكشن الكيمياء من 10 إلى 12", { exact: true })
  .waitFor();
assert.equal(
  await p
    .locator(".request-table")
    .getByText("أحمد محمود", { exact: true })
    .count(),
  0,
);
const views = [
  ["الأعذار الأكاديمية (2)", "excuses", 2, 6],
  ["الكل", "all", 5, 8],
  ["لم يحضر", "waiting", 2, 8],
  ["حاضر", "present", 3, 8],
  ["التسهيلات (2)", "accommodations", 2, 6],
  ["أعذار وتسهيلات", "requests", 3, 8],
  ["ألغوا المشاركة", "cancelled", 1, 8],
];
for (const [label, view, count, columns] of views) {
  await p.getByRole("button", { name: label, exact: true }).click();
  const xlsx = await download("xlsx");
  assert(xlsx.name.includes("-" + view + ".xlsx"));
  workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(xlsx.bytes);
  sheet = workbook.worksheets[0];
  assert.equal(sheet.rowCount, count + 7, view);
  assert.equal(sheet.columnCount, columns, view);
  const pdf = await download("pdf");
  assert(pdf.name.includes("-" + view + ".pdf"));
  assert.equal(pdf.bytes.subarray(0, 5).toString(), "%PDF-");
}
assert.equal(fontRequests.length, 1, "Reuse the PDF font across downloads");
await accommodation.click();
await p
  .getByRole("textbox", { name: "ابحث عن مشارك", exact: true })
  .fill("no match");
assert(
  await p
    .getByRole("button", { name: "تنزيل Excel", exact: true })
    .isDisabled(),
);
assert(
  await p.getByRole("button", { name: "تنزيل PDF", exact: true }).isDisabled(),
);
await p.getByRole("button", { name: "مسح البحث", exact: true }).click();
for (const width of [768, 390, 375]) {
  await p.setViewportSize({ width, height: 844 });
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Overflow at " + width,
  );
  assert(
    await p.getByRole("button", { name: "تنزيل PDF", exact: true }).isVisible(),
  );
}
await p.getByRole("button", { name: "تغيير المظهر", exact: true }).click();
await p.screenshot({
  path: "/workspace/work/leader-accommodations-phone-dark.png",
  fullPage: true,
});
role = "student";
await p.reload();
await p
  .getByRole("heading", { name: event.title, exact: true, level: 1 })
  .waitFor();
assert.equal(
  await p.locator(".leader-roster,.roster-downloads,.request-table").count(),
  0,
);
assert.deepEqual(errors, []);
console.log(
  "PASS three supplied photos loaded, separate request tables, search, all 7 views as XLSX/PDF, actual workbook contents, zero-prefixed codes/phones, request approval, cancellation exclusion, mobile/dark and student privacy",
);
await browser.close();
