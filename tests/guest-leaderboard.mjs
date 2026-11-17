import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.UI_TEST_BASE_URL || "http://localhost:4801";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  proxy:
    base.startsWith("https:") && process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
});
const p = await browser.newPage({
    ignoreHTTPSErrors: true,
    viewport: { width: 1365, height: 950 },
  }),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
let fail = true,
  empty = false,
  reads = 0;
await p.route("**/api/action*", async (route) => {
  if (route.request().method() === "GET")
    return route.fulfill({ json: { events: [], news: [], home: {} } });
  const b = route.request().postDataJSON();
  if (b.action !== "leaderboard")
    return route.fulfill({ status: 401, json: { error: "Login required" } });
  assert.deepEqual(b, { action: "leaderboard" });
  reads++;
  if (fail) {
    fail = false;
    return route.fulfill({
      status: 503,
      json: { error: "Fixture temporary outage" },
    });
  }
  await new Promise((r) => setTimeout(r, 300));
  return route.fulfill({
    json: {
      rows: empty
        ? []
        : [
            { full_name: "اسم ظاهر للضيف", points: 40 },
            { full_name: "اسم آخر", points: 20 },
          ],
    },
  });
});
await p.goto(base);
await p.getByRole("button", { name: "المتصدرون", exact: true }).click();
await p
  .getByRole("heading", {
    name: "مش قادرين نعرض المتصدرين دلوقتي",
    exact: true,
  })
  .waitFor();
assert.equal(await p.getByRole("dialog").count(), 0);
await p.getByRole("button", { name: "جرّب تاني", exact: true }).click();
await p.getByRole("status").filter({ hasText: "بنحمّل المتصدرين" }).waitFor();
await p.getByText("اسم ظاهر للضيف", { exact: true }).waitFor();
assert.equal(await p.locator(".leaderboard > div").count(), 2);
assert.equal(await p.locator(".leaderboard img").count(), 0);
assert.equal(
  await p.getByText("سجّل دخولك للمتابعة", { exact: true }).count(),
  0,
);
assert.equal(await p.getByRole("dialog").count(), 0);
assert.equal(reads, 2);
empty = true;
await p.reload();
await p.locator(".leaderboard .empty-state").waitFor();
assert.equal(await p.getByRole("dialog").count(), 0);
empty = false;
await p.goto(base + "/?view=leaderboard");
await p.getByText("اسم ظاهر للضيف", { exact: true }).waitFor();
for (const width of [390, 375]) {
  await p.setViewportSize({ width, height: 844 });
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
}
await p.goto(base + "/?view=account");
await p.getByText("سجّل دخولك للمتابعة", { exact: true }).waitFor();
assert.equal(await p.locator(".leaderboard").count(), 0);
await p.goto(base);
await p.locator(".dp-last-word").scrollIntoViewIfNeeded();
for (const theme of ["light", "dark"]) {
  await p.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
  const cta = p.locator(".dp-last-word .dp-join-large");
  await cta.hover();
  await p.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".dp-last-word .dp-join-large"))
        .backgroundColor === "rgb(206, 17, 38)",
  );
  assert.equal(
    await cta.evaluate((e) => getComputedStyle(e).color),
    "rgb(255, 255, 255)",
  );
  assert.equal(
    await cta.locator("svg").evaluate((e) => getComputedStyle(e).color),
    "rgb(255, 255, 255)",
  );
  assert(
    await p
      .locator(".dp-last-word h2")
      .evaluate((e) => parseFloat(getComputedStyle(e).marginBottom) >= 40),
  );
}
assert.equal(await p.locator("footer .site-credit").count(), 0);
assert(!(await p.locator("footer").innerText()).includes("Heba Adel"));
assert.equal(await p.locator('footer a[href^="mailto:"]').count(), 0);
await p.screenshot({
  path: "/workspace/work/footer-clean-phone-dark.png",
  fullPage: true,
});
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS guest navbar/deep-link leaderboard, loading/error/retry/empty rows, account remains private, mobile layout, red CTA/white text+arrow, spacing, no creator credit or email",
);
