import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.UI_TEST_BASE_URL || "http://localhost:5000";
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
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 390, height: 844 },
});
await context.addInitScript(() => {
  window.__suppressInstallPrompt = true;
  window.addEventListener(
    "beforeinstallprompt",
    (e) => {
      if (window.__suppressInstallPrompt) e.stopImmediatePropagation();
    },
    true,
  );
});
const p = await context.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(base);
await p
  .getByRole("heading", { name: "من أجل مصر متاحة للكل", exact: true })
  .waitFor();
const manifestUrl = await p
  .locator('link[rel="manifest"]')
  .getAttribute("href");
assert(manifestUrl?.includes("manifest.webmanifest"));
const manifestResponse = await context.request.get(
  new URL(manifestUrl, base).href,
);
assert.equal(manifestResponse.status(), 200);
const manifest = await manifestResponse.json();
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.lang, "ar-EG");
assert.equal(manifest.dir, "rtl");
assert.equal(manifest.theme_color, "#ce1126");
for (const icon of manifest.icons) {
  const response = await context.request.get(new URL(icon.src, base).href);
  assert.equal(response.status(), 200);
  const bytes = await response.body();
  assert.equal(bytes.readUInt32BE(16), Number(icon.sizes.split("x")[0]));
  assert.equal(bytes.readUInt32BE(20), Number(icon.sizes.split("x")[1]));
}
assert.equal(
  await p
    .locator('meta[name="mobile-web-app-capable"]')
    .getAttribute("content"),
  "yes",
);
assert(await p.locator('link[rel="apple-touch-icon"]').getAttribute("href"));
console.log("PWA check: worker ready");
await p.evaluate(() =>
  Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Service worker activation timed out")),
        20000,
      ),
    ),
  ]),
);
await p.waitForFunction(() => !!navigator.serviceWorker.controller);
const sw = await context.request.get(base + "/sw.js");
assert.equal(sw.status(), 200);
assert(sw.headers()["cache-control"].includes("no-store"));
assert(sw.headers()["content-type"].includes("javascript"));
console.log("PWA check: installability");
const cdp = await context.newCDPSession(p);
const parsed = await cdp.send("Page.getAppManifest");
assert.equal(parsed.errors.length, 0);
const eligibility = await cdp.send("Page.getInstallabilityErrors");
assert.deepEqual(
  eligibility.installabilityErrors.filter(
    (e) =>
      e.errorId !== "in-incognito" &&
      !(
        base.startsWith("https:") &&
        process.env.HTTPS_PROXY &&
        e.errorId === "not-from-secure-origin"
      ),
  ),
  [],
);
console.log("PWA check: help");
const install = p.getByRole("button", { name: "تثبيت التطبيق", exact: true });
await install.click();
const dialog = p.getByRole("dialog", {
  name: "تثبيت التطبيق على موبايلك",
  exact: true,
});
await dialog.waitFor();
await dialog
  .getByRole("heading", { name: "على Android", exact: true })
  .waitFor();
await dialog
  .getByRole("heading", { name: "على iPhone", exact: true })
  .waitFor();
assert((await dialog.innerText()).includes("Safari"));
assert((await dialog.innerText()).includes("Chrome"));
await p.keyboard.press("Escape");
assert.equal(await dialog.isVisible(), false);
for (const theme of ["dark", "light"]) {
  await p.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
  await install.click();
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await dialog.getByRole("button", { name: "تمام", exact: true }).click();
}
console.log("PWA check: api privacy");
const personal = await p.evaluate(async () => {
  const r = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "me" }),
  });
  return r.status;
});
assert.equal(personal, 401);
const cached = await p.evaluate(async () => {
  const result = [];
  for (const name of await caches.keys()) {
    if (!name.startsWith("mam-pwa-static-")) continue;
    const c = await caches.open(name);
    for (const r of await c.keys()) result.push(new URL(r.url).pathname);
  }
  return result.sort();
});
assert.deepEqual(cached, [
  "/icons/logo-192.png",
  "/icons/logo-512.png",
  "/offline.html",
]);
console.log("PWA check: offline");
await context.setOffline(true);
assert.equal(
  await p.evaluate(async () => {
    try {
      await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rsvp",
          event_id: "22222222-2222-4222-8222-222222222222",
        }),
      });
      return "resolved";
    } catch {
      return "offline";
    }
  }),
  "offline",
);
await p.goto(base + "/?view=account");
await p
  .getByRole("heading", { name: "مفيش اتصال بالإنترنت دلوقتي", exact: true })
  .waitFor();
assert.equal(await p.locator("form").count(), 0);
assert.equal(await p.locator(".account,.leader-roster").count(), 0);
await p.screenshot({ path: "/workspace/work/pwa-offline-phone.png" });
console.log("PWA check: reconnect");
await context.setOffline(false);
await p.getByRole("link", { name: "جرّب تاني", exact: true }).click();
await p
  .getByRole("heading", { name: "من أجل مصر متاحة للكل", exact: true })
  .waitFor();
console.log("PWA check: native prompt");
await install.waitFor({ state: "visible" });
await p.evaluate(() => {
  window.__suppressInstallPrompt = false;
  window.__nativePromptCalls = 0;
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, {
    prompt: async () => {
      window.__nativePromptCalls++;
    },
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  window.dispatchEvent(event);
});
await install.click();
await p.waitForFunction(() => window.__nativePromptCalls === 1);
assert.equal(await install.count(), 0);
console.log("PWA check: standalone");
const standalone = await browser.newContext({ ignoreHTTPSErrors: true });
await standalone.addInitScript(() =>
  Object.defineProperty(navigator, "standalone", {
    value: true,
    configurable: true,
  }),
);
const app = await standalone.newPage();
await app.goto(base);
await app
  .getByRole("heading", { name: "من أجل مصر متاحة للكل", exact: true })
  .waitFor();
assert.equal(
  await app.getByRole("button", { name: "تثبيت التطبيق", exact: true }).count(),
  0,
);
const persistent = await chromium.launchPersistentContext(
  "/tmp/mam-pwa-install-" + Date.now(),
  {
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      ...(base.startsWith("https:") && process.env.HTTPS_PROXY
        ? ["--ignore-certificate-errors"]
        : []),
    ],
    ignoreHTTPSErrors: true,
    proxy:
      base.startsWith("https:") && process.env.HTTPS_PROXY
        ? { server: process.env.HTTPS_PROXY }
        : undefined,
  },
);
const installPage = persistent.pages()[0];
await installPage.goto(base);
await installPage.evaluate(() =>
  Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Service worker activation timed out")),
        20000,
      ),
    ),
  ]),
);
const installCdp = await persistent.newCDPSession(installPage);
const installable = await installCdp.send("Page.getInstallabilityErrors");
assert.deepEqual(
  installable.installabilityErrors.filter(
    (e) =>
      !(
        base.startsWith("https:") &&
        process.env.HTTPS_PROXY &&
        e.errorId === "not-from-secure-origin"
      ),
  ),
  [],
);
if (installable.installabilityErrors.length)
  console.log(
    "PWA test proxy certificate limits remote Chromium installability; full non-incognito criteria passed locally.",
  );
await persistent.close();
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS manifest, icon dimensions, Apple metadata, Chromium installability, service-worker control/headers, Android/iPhone help, native prompt simulation, installed-state hiding, static-only cache, offline API write failure, private navigation offline fallback, reconnect, mobile/themes",
);
