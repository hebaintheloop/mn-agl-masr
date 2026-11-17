import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.UI_TEST_BASE_URL || "http://localhost:5201";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    ...(base.startsWith("https:") && process.env.HTTPS_PROXY
      ? ["--ignore-certificate-errors"]
      : []),
  ],
  proxy:
    base.startsWith("https:") && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
const p = await browser.newPage({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
  }),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
let role = null,
  loginCalls = 0,
  rsvpCalls = 0,
  failedMe = 0,
  failedPublic = 0,
  registrations = [],
  submitted = null;
const event = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "لقاء تجربة الواجهة",
  description: "تفاصيل الفعالية",
  location: "كلية العلوم",
  start_at: "2026-12-05T08:00:00Z",
  end_at: "2026-12-05T12:00:00Z",
  points: 20,
  cover_url: null,
};
const member = () => ({
  profile: {
    id: "fixture-user",
    role,
    full_name: "طالب تجربة الواجهة",
    student_code: "2527001",
    phone: "01012345678",
  },
  registrations,
  points: [],
});
await p.route("**/api/action*", async (route) => {
  if (route.request().method() === "GET") {
    if (failedPublic-- > 0)
      return route.fulfill({
        status: 503,
        json: { error: "Fixture data outage" },
      });
    return route.fulfill({ json: { events: [], home: {} } });
  }
  const b = route.request().postDataJSON();
  if (b.action === "leaderboard") return route.fulfill({ json: { rows: [] } });
  if (!role)
    return route.fulfill({ status: 401, json: { error: "Login required" } });
  if (b.action === "me") {
    if (failedMe-- > 0)
      return route.fulfill({
        status: 503,
        json: { error: "Fixture refresh outage" },
      });
    return route.fulfill({ json: member() });
  }
  if (b.action === "events")
    return route.fulfill({ json: { events: [event] } });
  if (b.action === "event") return route.fulfill({ json: { event } });
  if (b.action === "event-stats")
    return route.fulfill({
      json: {
        rows: [
          {
            event_id: event.id,
            rsvp_count: 1,
            attended_count: 0,
            pending_count: 0,
          },
        ],
      },
    });
  if (b.action === "attendees")
    return route.fulfill({ json: { rows: [], attendance: [] } });
  if (b.action === "rsvp") {
    rsvpCalls++;
    submitted = b;
    registrations = [
      { ...b, going: b.going !== false, request_status: "accepted" },
    ];
    failedMe = 1;
    return route.fulfill({ json: { saved: true, status: "accepted" } });
  }
  return route.fulfill({
    status: 400,
    json: { error: "Unexpected fixture action" },
  });
});
await p.route("**/api/auth", async (route) => {
  const b = route.request().postDataJSON();
  if (b.action === "login") {
    loginCalls++;
    assert.equal(b.student_code, "2527001");
    await new Promise((r) => setTimeout(r, 450));
    role = "student";
    return route.fulfill({ json: { ok: true } });
  }
  if (b.action === "signup") {
    assert.equal(b.student_code, "2527002");
    assert.equal(b.phone, "01012345678");
    assert.equal(b.national_id, "99999999999999");
    role = "student";
    return route.fulfill({
      json: { ok: true, recovery: "fixture-recovery-code-123456789012" },
    });
  }
  return route.fulfill({
    status: 400,
    json: { error: "Unexpected auth fixture" },
  });
});
await p.goto(base);
await p.getByRole("button", { name: "سجّل معانا", exact: true }).waitFor();
await p.evaluate(() =>
  document.fonts.load('600 15px "Noto Sans Arabic Nav"', "الفعاليات"),
);
assert((await p.locator("#how-to-use").innerText()).includes("كودك في الكلية"));
assert(
  !(await p.locator("body").innerText()).includes("كودك الجامعي من غير شرطات"),
);
const menu = p.getByRole("button", { name: "القائمة", exact: true });
await menu.click();
const mobileLogin = p.locator("nav .mobile-login");
assert(await mobileLogin.isVisible());
const cdp = await p.context().newCDPSession(p);
await cdp.send("DOM.enable");
await cdp.send("CSS.enable");
const tree = await cdp.send("DOM.getDocument");
const node = await cdp.send("DOM.querySelector", {
  nodeId: tree.root.nodeId,
  selector: ".site-header nav button",
});
const fonts = await cdp.send("CSS.getPlatformFontsForNode", {
  nodeId: node.nodeId,
});
assert(
  fonts.fonts.some((f) => f.isCustomFont && f.familyName.includes("Noto")),
  "New Arabic font must actually render",
);
await p.keyboard.press("Escape");
assert.equal(await menu.getAttribute("aria-expanded"), "false");
await menu.click();
await p.locator(".dp-about").click();
assert.equal(await menu.getAttribute("aria-expanded"), "false");
await menu.click();
await mobileLogin.click();
const dialog = p.getByRole("dialog");
await dialog.waitFor();
assert.equal(
  await p.evaluate(() => document.activeElement?.getAttribute("name")),
  "student_code",
);
const code = dialog.getByLabel("كودك في الكلية", { exact: true });
await code.fill("٢٥٢٧٠٠١");
assert.equal(await code.inputValue(), "2527001");
await dialog.locator("[name=password]").fill("FixturePassword123!");
await dialog.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
await p.keyboard.press("Escape");
assert(await dialog.isVisible());
assert(
  await dialog.getByRole("button", { name: "إغلاق", exact: true }).isDisabled(),
);
await dialog
  .locator("form")
  .evaluate((form) =>
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
await p.getByRole("heading", { name: "الفعاليات", exact: true }).waitFor();
assert.equal(loginCalls, 1);
await p.goto(base + "/?event=" + event.id);
await p
  .getByRole("heading", { name: event.title, level: 1, exact: true })
  .waitFor();
assert((await p.locator(".event-meta").first().innerText()).includes("إلى"));
assert(
  (await p.locator(".event-meta").first().innerText()).includes(
    "بتوقيت القاهرة",
  ),
);
await p.locator("[name=accommodation]").fill("مقعد مناسب بسبب احتياج صحي");
await p
  .getByRole("button", { name: "أكد مشاركتك واحفظ الطلبات", exact: true })
  .click();
await p.getByText("مشاركة مؤكدة", { exact: true }).waitFor();
await p.getByRole("button", { name: "حفظ التعديلات", exact: true }).waitFor();
assert.equal(rsvpCalls, 1);
assert.equal(submitted.accommodation, "مقعد مناسب بسبب احتياج صحي");
await p.getByRole("button", { name: "تحديث الحساب", exact: true }).waitFor();
assert.equal(
  await p.getByText("سجّل دخولك للمتابعة", { exact: true }).count(),
  0,
);
await p.getByRole("button", { name: "تحديث الحساب", exact: true }).click();
await p.locator(".profile-retry").waitFor({ state: "hidden" });
failedMe = 1;
await p.goto(base + "/?view=account");
await p.getByRole("button", { name: "تحديث الحساب", exact: true }).waitFor();
assert.equal(
  await p.getByText("سجّل دخولك للمتابعة", { exact: true }).count(),
  0,
);
await p.getByRole("button", { name: "تحديث الحساب", exact: true }).click();
await p.getByRole("heading", { name: "حسابي", exact: true }).waitFor();
const phone = p.locator("input[name=phone]");
await phone.fill("٠١٠١٢٣٤٥٦٧٨");
assert.equal(await phone.inputValue(), "01012345678");
failedPublic = 1;
await p.goto(base + "/?event=" + event.id);
await p
  .getByRole("heading", {
    name: "مش قادرين نحمّل الفعالية دلوقتي",
    exact: true,
  })
  .waitFor();
await p.getByRole("button", { name: "جرّب تاني", exact: true }).click();
await p
  .getByRole("heading", { name: event.title, exact: true, level: 1 })
  .waitFor();
assert(p.url().includes(event.id));
for (const variant of [null, "student", "leader"]) {
  role = variant;
  await p.goto(base + (role === "leader" ? "/?view=leader" : "/"));
  await p.waitForFunction(
    () => !document.querySelector(".nav-session-loading"),
  );
  for (const width of [1365, 1024, 768, 390, 375, 360]) {
    await p.setViewportSize({ width, height: 950 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Overflow " + variant + " " + width,
    );
    if (width <= 1000) {
      const targets = await p.locator(".site-header").evaluate((e) =>
        [...e.querySelectorAll("button")]
          .filter((n) => {
            const r = n.getBoundingClientRect();
            return r.width && r.height && (r.width < 40 || r.height < 40);
          })
          .map((n) => ({
            text: n.textContent,
            width: n.getBoundingClientRect().width,
            height: n.getBoundingClientRect().height,
          })),
      );
      assert.deepEqual(
        targets,
        [],
        JSON.stringify({ variant, width, targets }),
      );
    }
  }
}
await p.getByRole("button", { name: "تغيير المظهر", exact: true }).click();
await p.screenshot({ path: "/workspace/work/ux-navbar-after-phone-dark.png" });
role = null;
await p.goto(base + "/?join=1");
const signup = p.getByRole("dialog");
await signup.locator('[name="full_name"]').fill("طالب اختبار");
await signup.locator('[name="student_code"]').fill("۲۵۲۷۰۰۲");
await signup.locator('[name="phone"]').fill("٠١٠١٢٣٤٥٦٧٨");
await signup.locator('[name="national_id"]').fill("٩٩٩٩٩٩٩٩٩٩٩٩٩٩");
await signup.locator('[name="password"]').fill("FixturePassword123!");
assert(await signup.locator("form").evaluate((e) => e.checkValidity()));
await signup.getByRole("button", { name: "إنشاء حساب", exact: true }).click();
await p.getByRole("dialog", { name: "كود الاستعادة", exact: true }).waitFor();
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS actual Noto font, college-code wording, accessible mobile login/menu, input focus and Arabic digits, duplicate-submit/close protection, confirmed RSVP retained after refresh failure, edit label, profile retry, event duration and deep-link retry, guest/student/leader responsive targets 360-1365px, no browser errors",
);
