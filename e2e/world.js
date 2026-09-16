// The tabs, assets, draft controls, comparisons, and charts share one world clock.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const appUrl = process.env.APP_URL || "http://127.0.0.1:5173/";
const outputDir = process.env.SCREENSHOT_DIR || __dirname;
const width = Number(process.env.VIEWPORT_WIDTH || 1760);
const height = Number(process.env.VIEWPORT_HEIGHT || 1050);
const mobile = process.env.MOBILE_VIEWPORT === "true";
const selector = (id) => `[data-testid="${id}"]`;

async function click(page, id) {
  await page.$eval(selector(id), (element) => element.scrollIntoView({ block: "center", inline: "center" }));
  await page.click(selector(id));
}

async function fill(page, id, value) {
  await page.$eval(selector(id), (element) => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === "DETAILS") parent.open = true;
    }
    element.scrollIntoView({ block: "center" });
  });
  await page.click(selector(id), { clickCount: 3 });
  await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control");
  await page.keyboard.type(String(value));
  await page.keyboard.press("Tab");
}

async function state(page) {
  return page.$eval(".world-app", (element) => ({
    tab: element.dataset.tab, hour: Number(element.dataset.hourIndex),
    run: element.dataset.runId, mode: element.dataset.case,
    asset: element.querySelector('[data-testid="world-inspector"]')?.dataset.asset,
    grid: Number(element.querySelector('[data-testid="world-grid"]').dataset.value),
  }));
}

async function responseAfter(page, action) {
  const previous = (await state(page)).run;
  const response = page.waitForResponse((item) =>
    item.url().endsWith("/coupling/evaluate") && item.request().method() === "POST",
  { timeout: 90000 });
  await action();
  const result = await response;
  assert.equal(result.status(), 200, await result.text());
  const payload = await result.json();
  await page.waitForFunction((old) => {
    const root = document.querySelector(".world-app");
    return root.dataset.runId && root.dataset.runId !== old
      && !root.querySelector('[data-testid="run-coupling"]').disabled;
  }, { timeout: 15000 }, previous);
  return payload;
}

async function screenshot(page, name) {
  await new Promise((resolve) => setTimeout(resolve, 750));
  await page.screenshot({ path: path.join(outputDir, `world-${name}.png`) });
}

(async () => {
  let browser;
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
    });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    const firstResponse = page.waitForResponse((response) => response.url().endsWith("/coupling/evaluate"));
    await page.goto(appUrl, { waitUntil: "networkidle2" });
    const first = await firstResponse;
    assert.equal(first.status(), 200);
    await page.waitForFunction(() => document.querySelector(".world-app")?.dataset.runId);
    assert.equal((await state(page)).hour, 12);
    assert.equal(await page.$eval(selector("world-play"), (element) => element.textContent), "Play");
    await screenshot(page, "01-overview");

    // The in-world label is a real keyboard-accessible navigation target.
    await click(page, "asset-label-solar");
    assert.equal((await state(page)).tab, "energy");
    assert.equal((await state(page)).asset, "solar");
    assert.equal((await state(page)).hour, 12);
    await screenshot(page, "02-energy");
    await click(page, "tab-water");
    assert.equal((await state(page)).asset, "cooling");
    assert.ok(await page.$eval(selector("world-inspector"), (element) =>
      element.textContent.includes("Withdrawal") && element.textContent.includes("Consumption")));
    await screenshot(page, "03-water");
    await click(page, "asset-list-hydro");
    assert.equal((await state(page)).tab, "water");
    assert.ok(await page.$eval(selector("world-inspector"), (element) => element.textContent.includes("Not estimated")));
    await click(page, "tab-compute");
    assert.equal((await state(page)).asset, "compute");
    await screenshot(page, "04-compute");

    await click(page, "tab-energy");
    await click(page, "asset-list-battery");
    await click(page, "edit-selected");
    assert.equal((await state(page)).tab, "design");
    await fill(page, "sample-count", 32);
    await fill(page, "solar-mw", 40);
    assert.ok(await page.$(".world-scene-status.draft"));
    assert.equal(await page.$eval(selector("world-grid"), (element) => element.hasAttribute("data-value")), false);
    const edited = await responseAfter(page, () => click(page, "run-coupling"));
    await click(page, "tab-energy");
    assert.equal((await state(page)).asset, "battery");
    assert.equal((await state(page)).hour, 12);
    assert.equal((await state(page)).grid, edited.hourly_trace[12].grid_to_load_mw);

    await click(page, "open-hourly-chart");
    await page.select(selector("trace-window"), "week");
    await page.focus(selector("inspect-hour"));
    await page.keyboard.press("End");
    assert.equal((await state(page)).hour, 167);
    assert.equal((await state(page)).grid, edited.hourly_trace[167].grid_to_load_mw);
    assert.equal(await page.$eval(selector("world-hour"), (element) => element.value), "167");
    await screenshot(page, "05-linked-chart");
    await click(page, "close-analysis");

    await click(page, "tab-compare");
    await click(page, "view-baseline");
    assert.equal((await state(page)).mode, "baseline");
    assert.equal((await state(page)).grid, edited.hourly_trace[167].baseline_grid_import_mw);
    assert.equal((await state(page)).hour, 167);
    await screenshot(page, "06-baseline");
    const month = await responseAfter(page, () => page.select(selector("world-month"), "8"));
    assert.equal((await state(page)).mode, "baseline");
    assert.ok(month.hourly_trace[0].timestamp.startsWith("2027-08"));
    await click(page, "view-proposed");

    await click(page, "tab-design");
    for (const id of ["solar-mw", "wind-mw", "hydro-mw", "nuclear-mw", "gas-mw", "battery-power-mw", "battery-energy-mwh"]) {
      await fill(page, id, 0);
    }
    await fill(page, "grid-import-limit", 0);
    const shortage = await responseAfter(page, () => click(page, "run-coupling"));
    assert.equal(shortage.comparison.comparable, false);
    assert.equal(shortage.comparison.carbon_change_pct_p50, null);
    assert.ok(await page.$(selector("world-shortfall")));
    await click(page, "tab-compare");
    await screenshot(page, "07-shortfall");
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth
      || document.querySelector(".world-app").scrollWidth > window.innerWidth);
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({
      width, height, sharedClock: true, bidirectionalSelection: true,
      draftResultsHidden: true, pairedBaseline: true, monthNavigation: true,
      shortfallClaimsWithheld: true, horizontalOverflow: false, errors,
    }, null, 2));
  } finally {
    if (browser) await browser.close();
  }
})().catch((error) => { console.error("WORLD E2E FAILED:", error); process.exitCode = 1; });
