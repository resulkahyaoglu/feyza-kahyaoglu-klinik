import { chromium } from "playwright";

const base = "http://127.0.0.1:8080";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function shot(page, name) {
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: true });
}

async function withPage(name, fn, viewport = { width: 1280, height: 800 }) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${name} console: ${msg.text()}`);
  });
  try {
    await fn(page);
  } catch (e) {
    errors.push(`${name} throw: ${e.message}`);
    await shot(page, `fail-${name}`).catch(() => {});
  } finally {
    await page.close();
  }
}

await withPage("home-hizmetler", async (page) => {
  await page.goto(base + "/hizmetler", { waitUntil: "networkidle" });
  await shot(page, "hizmetler");
});

await withPage("randevu", async (page) => {
  await page.goto(base + "/randevu", { waitUntil: "networkidle" });
  await shot(page, "randevu");
  await page.fill("#name", "Zeynep Aksoy");
  await page.fill("#phone", "05339876543");
  await page.fill("#date", "2026-09-03");
  await page.selectOption("#time", "11:00");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/randevu/basarili", { timeout: 15000 });
  await shot(page, "randevu-basarili");
});

await withPage("admin-login", async (page) => {
  await page.goto(base + "/admin/login", { waitUntil: "networkidle" });
  await shot(page, "admin-login");
  await page.fill("#username", "admin");
  await page.fill("#password", "feyza2026");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, "admin-dashboard");
  const body = await page.locator("body").innerText();
  if (!body.includes("Bugün ne var")) throw new Error("dashboard title missing: " + body.slice(0, 200));
  if (!body.includes("Ayşe")) throw new Error("seeded client missing");
});

await withPage("admin-clients", async (page) => {
  await page.goto(base + "/admin/login", { waitUntil: "networkidle" });
  await page.fill("#username", "admin");
  await page.fill("#password", "feyza2026");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });
  await page.goto(base + "/admin/randevular", { waitUntil: "networkidle" });
  await shot(page, "admin-randevular");
  await page.goto(base + "/admin/danisanlar", { waitUntil: "networkidle" });
  await shot(page, "admin-danisanlar");
  await page.click("text=Ayşe Yılmaz");
  await page.waitForURL("**/admin/danisan/**", { timeout: 10000 });
  await page.waitForTimeout(500);
  await shot(page, "admin-danisan-detay");
});

await withPage("client-login", async (page) => {
  await page.goto(base + "/giris", { waitUntil: "networkidle" });
  await shot(page, "client-login");
  await page.fill("#phone", "05551112233");
  await page.fill("#password", "danisan123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/panel", { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, "client-panel");
  const body = await page.locator("body").innerText();
  if (!body.includes("Diyet listeleri")) throw new Error("panel missing diet: " + body.slice(0, 300));
  if (!body.includes("Ayşe")) throw new Error("name missing");
});

await withPage("client-mobile", async (page) => {
  await page.goto(base + "/giris", { waitUntil: "networkidle" });
  await page.fill("#phone", "05551112233");
  await page.fill("#password", "danisan123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/panel", { timeout: 15000 });
  await page.waitForTimeout(500);
  await shot(page, "client-panel-mobile");
}, { width: 390, height: 844 });

await withPage("about-contact", async (page) => {
  await page.goto(base + "/hakkimda", { waitUntil: "networkidle" });
  await shot(page, "hakkimda");
  await page.goto(base + "/iletisim", { waitUntil: "networkidle" });
  await shot(page, "iletisim");
});

console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
process.exit(errors.length ? 1 : 0);
