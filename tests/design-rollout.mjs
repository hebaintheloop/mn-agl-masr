import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.UI_TEST_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  proxy: base.startsWith("https:") && process.env.HTTPS_PROXY ? {server:process.env.HTTPS_PROXY} : undefined,
});
const event = {
  id: "ui-only-event",
  title: "فعالية لمعاينة الواجهة",
  description: "بيانات توضيحية داخل اختبار المتصفح فقط",
  location: "كلية العلوم، جامعة القاهرة",
  start_at: "2026-12-05T08:00:00+02:00",
  end_at: "2026-12-05T16:00:00+02:00",
  points: 30,
  cover_url: null,
};
const contrast = async (page) => {
  const labels = await page.locator(".status-label").evaluateAll((els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, fg: s.color };
    }),
  );
  assert(labels.length > 0);
  function rgb(s) {
    return s.match(/[\d.]+/g).map(Number);
  }
  function lum(c) {
    const x = c.slice(0, 3).map((v) => {
      const a = v / 255;
      return a <= 0.04045 ? a / 12.92 : ((a + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2];
  }
  for (const label of labels) {
    const a = rgb(label.bg),
      b = rgb(label.fg);
    assert(a.length === 3 || a[3] === 1, "Label must have an opaque fill");
    const x = lum(a),
      y = lum(b);
    assert(
      (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) >= 4.5,
      JSON.stringify(label),
    );
  }
};
for (const role of ["student", "leader"]) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: base.startsWith("https:"),
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
    timezoneId: "America/Los_Angeles",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let user = {
    profile: {
      id: "ui-only-user",
      student_code: "0000000",
      full_name: "طالب لمعاينة الواجهة",
      phone: "00000000000",
      role,
    },
    registrations: [
      {
        event_id: event.id,
        going: true,
        accommodation: "",
        excuse: "تعارض سكشن",
        request_status: "accepted",
      },
    ],
    points: [{ event_id: event.id, points: 30 }],
  };
  // All fixture traffic is intercepted in the browser. No accounts, roles or records are written to Supabase.
  await page.route("**/api/action", async (route) => {
    const req = route.request();
    if (req.method() === "GET")
      return route.fulfill({ json: { events: [event], home: {}, news: [] } });
    const b = req.postDataJSON();
    if (b.action === "me") return route.fulfill({ json: user });
    if (b.action === "leaderboard")
      return route.fulfill({
        json: {
          rows: [
            { full_name: "طالب للمعاينة", points: 30 },
            { full_name: "طالبة للمعاينة", points: 20 },
          ],
        },
      });
    if (b.action === "attendees")
      return route.fulfill({
        json: {
          rows: [
            {
              event_id: event.id,
              user_id: "ui-only-user",
              profiles: user.profile,
              excuse: "تعارض سكشن",
              accommodation: "",
              request_status: "accepted",
            },
          ],
          attendance: [
            {
              user_id: "ui-only-user",
              checked_at: "2026-12-05T08:00:00+02:00",
            },
          ],
        },
      });
    if (b.action === "rsvp")
      return route.fulfill({ json: { saved: true, status: "accepted" } });
    return route.fulfill({
      status: 400,
      json: { error: "UI fixture does not permit this operation" },
    });
  });
  await page.goto(base);
  await page
    .getByRole("heading", { name: "نتعلّم، نشارك، ونصنع أثرًا", exact: false })
    .waitFor();
  assert.equal(await page.locator(".dp-drawn-arrow").count(), 0);
  assert.equal(await page.locator(".dp-preview-note").count(), 0);
  await page.screenshot({
    path: `/workspace/work/rollout-home-${role}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "الفعاليات", exact: true })
    .first()
    .click();
  await page.getByRole("heading", { name: "الفعاليات", exact: true }).waitFor();
  await contrast(page);
  await page.screenshot({
    path: `/workspace/work/rollout-events-${role}.png`,
    fullPage: true,
  });
  const cardTime = await page.locator(".event-card time").first().innerText();
  await page.getByRole("button", { name: /فعالية لمعاينة الواجهة/ }).click();
  await page
    .getByRole("heading", {
      name: "فعالية لمعاينة الواجهة",
      exact: true,
      level: 1,
    })
    .waitFor();
  const detailTime = await page.locator(".event-meta small").first().innerText();
  assert.equal(cardTime,detailTime,"Event cards and event details must show the same Cairo time");
  await contrast(page);
  if (role === "leader") {
    await page
      .getByRole("button", { name: "المشاركون وطلبات الأعذار", exact: true })
      .click();
    await page.getByText("الطلبات مقبولة", { exact: true }).waitFor();
    await contrast(page);
  }
  await page.screenshot({
    path: `/workspace/work/rollout-event-${role}.png`,
    fullPage: true,
  });
  for (const width of [390, 375]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Overflow ${role} ${width}`,
    );
    await page
      .getByRole("button", { name: "تغيير المظهر", exact: true })
      .click();
    await contrast(page);
    await page.getByRole("button", { name: "EN", exact: true }).click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.getByRole("button", { name: "عربي", exact: true }).click();
  }
  await page.screenshot({
    path: `/workspace/work/rollout-event-phone-${role}.png`,
    fullPage: true,
  });
  await page.goto(base + "/?view=account");
  await page.getByRole("heading", { name: "حسابي", exact: true }).waitFor();
  if (role === "leader") {
    await page.getByText("قائد الفريق", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "إنشاء فعالية", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Create event" }).waitFor();
    await page.screenshot({
      path: "/workspace/work/rollout-create-event-phone.png",
      fullPage: true,
    });
    await page.keyboard.press("Escape");
  }
  await page.screenshot({
    path: `/workspace/work/rollout-account-phone-${role}.png`,
    fullPage: true,
  });
  await page.goto(base + "/?view=scan");
  await page
    .getByRole("heading", { name: "تسجيل الحضور", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "فتح الكاميرا", exact: true })
    .waitFor();
  await page.screenshot({
    path: `/workspace/work/rollout-scanner-phone-${role}.png`,
    fullPage: true,
  });
  await page.goto(base + "/?view=leaderboard");
  await page.getByRole("heading", { name: "المتصدرون", exact: true }).waitFor();
  await page.getByText("طالبة للمعاينة", { exact: true }).waitFor();
  await page.screenshot({
    path: `/workspace/work/rollout-leaderboard-phone-${role}.png`,
    fullPage: true,
  });
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(
    `${role} UI: home, events, requests, account, leaderboard, dark mode, languages and solid-label contrast passed.`,
  );
  await context.close();
}
const context = await browser.newContext({
  ignoreHTTPSErrors: base.startsWith("https:"),
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();
await page.route("**/api/action", (route) =>
  route.fulfill(
    route.request().method() === "GET"
      ? { json: { events: [], news: [], home: {} } }
      : { status: 401, json: { error: "Login required" } },
  ),
);
await page.goto(base);
await page.getByTestId("empty-events").waitFor();
assert.equal(
  await page.getByText("يوم العلوم المفتوح", { exact: true }).count(),
  0,
);
await page.goto(base + "/?view=account");
await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
await page.getByRole("dialog").waitFor();
await page.screenshot({
  path: "/workspace/work/rollout-login-phone.png",
  fullPage: true,
});
console.log(
  "Live homepage has no demo events; logged-out account view opens login.",
);
await context.close();
await browser.close();
