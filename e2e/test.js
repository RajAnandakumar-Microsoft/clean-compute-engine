// Headless visual check + screenshots for the Clean Compute Engine UI.
const puppeteer = require("puppeteer");

(async () => {
  const errors = [];
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle",
      "--use-angle=swiftshader", "--window-size=1600,900", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  await page.goto("http://localhost:5173/", { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForSelector(".center canvas", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 3000));

  // scrub to midday so solar is generating and the scene is lively
  await page.evaluate(() => (window).useStore?.getState().scrub(13));
  await new Promise((r) => setTimeout(r, 1500));

  const facility = await page.$eval(".kpis .kpi:first-child .kpi-val", (el) => el.textContent.trim());
  await page.screenshot({ path: "shot-1-ecosystem.png" });

  // hall view
  const hall = await page.$(".tree-row.d1");
  if (hall) { await hall.click(); await new Promise((r) => setTimeout(r, 2500)); }
  await page.screenshot({ path: "shot-2-hall.png" });

  // drill into a rack
  const racks = await page.$$(".tree-row.d2");
  let inspectorRack = null;
  if (racks.length > 3) {
    await racks[3].click();
    await new Promise((r) => setTimeout(r, 3000));
    inspectorRack = await page.$eval(".inspector h3", (el) => el.textContent.trim());
  }
  await page.screenshot({ path: "shot-3-drill.png" });

  // lifetime view
  await page.evaluate(() => (window).useStore?.getState().setView("ecosystem"));
  await page.evaluate(() => (window).useStore?.getState().setTimescale("lifetime"));
  await new Promise((r) => setTimeout(r, 1800));
  await page.evaluate(() => (window).useStore?.getState().setLifetimeIdx(9));
  await new Promise((r) => setTimeout(r, 1800));
  const avoided = await page.evaluate(() => {
    const lt = (window).useStore?.getState().lifetime; const i = 9;
    return lt ? lt.avoided_carbon_t[i] : null;
  });
  await page.screenshot({ path: "shot-4-lifetime.png" });

  console.log(JSON.stringify({
    facility, inspectorRack, avoided, errorCount: errors.length, errors: errors.slice(0, 6),
  }, null, 2));
  await browser.close();
  process.exit(errors.length === 0 && facility && facility !== "–" ? 0 : 1);
})().catch((e) => { console.error("E2E CRASH:", e.message); process.exit(2); });
