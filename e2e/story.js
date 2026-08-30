// Playable site-to-futures browser test for the voxel story.
const path = require("path");
const puppeteer = require("puppeteer");

const appUrl = process.env.APP_URL || "http://127.0.0.1:5173/";
const storyUrl = new URL("/story", appUrl).toString();
const outputDir = process.env.SCREENSHOT_DIR || __dirname;

async function screenshot(page, name) {
  await new Promise((resolve) => setTimeout(resolve, 650));
  await page.screenshot({ path: path.join(outputDir, `story-${name}.png`) });
}

async function clickButtonWithText(page, text) {
  const clicked = await page.evaluate((buttonText) => {
    const button = [...document.querySelectorAll("button")]
      .find((element) => element.textContent.includes(buttonText));
    if (!button) return false;
    button.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`Button not found: ${text}`);
}

async function setRangeValue(page, selector, value) {
  await page.$eval(selector, (element, nextValue) => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    valueSetter.call(element, nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

(async () => {
  const errors = [];
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--window-size=1600,900",
      "--ignore-gpu-blocklist",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  await page.goto(storyUrl, { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForSelector(".story-app canvas", { timeout: 15000 });
  await page.waitForSelector(".voxel-action", { timeout: 15000 });
  await screenshot(page, "01-site");

  await page.click(".voxel-action");
  await page.waitForFunction(
    () => document.querySelector(".story-eyebrow")?.textContent.startsWith("02"),
  );
  await clickButtonWithText(page, "Inference-led");
  await screenshot(page, "02-build");

  await clickButtonWithText(page, "Start operating");
  await page.waitForFunction(
    () => document.querySelector(".story-eyebrow")?.textContent.startsWith("03"),
  );
  await setRangeValue(page, ".story-slider.year input", "2032");
  await page.waitForFunction(
    () => document.querySelector(".story-header-state b")?.textContent === "2032",
  );
  await screenshot(page, "03-time");

  await clickButtonWithText(page, "Open possible futures");
  await page.waitForFunction(
    () => document.querySelector(".story-eyebrow")?.textContent.startsWith("04"),
  );

  await page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    let intercepted = false;
    window.fetch = (input, init) => {
      if (!intercepted && String(input).endsWith("/forecast") && init?.method === "POST") {
        intercepted = true;
        return new Promise((resolve, reject) => {
          window.__releaseStoryForecast = () => {
            originalFetch(input, init).then(resolve, reject);
          };
        });
      }
      return originalFetch(input, init);
    };
  });
  await clickButtonWithText(page, "Simulate P10");
  await page.waitForFunction(() => Boolean(window.__releaseStoryForecast));
  await clickButtonWithText(page, "Time");
  await setRangeValue(page, ".story-slider.year input", "2033");
  const staleResponse = page.waitForResponse(
    (response) => response.url().endsWith("/forecast")
      && response.request().method() === "POST",
    { timeout: 60000 },
  );
  await page.evaluate(() => window.__releaseStoryForecast());
  await staleResponse;
  await clickButtonWithText(page, "Futures");
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")]
      .find((element) => element.textContent.includes("Simulate P10"));
    return Boolean(button && !button.disabled);
  });
  if (await page.$(".story-quantiles")) {
    throw new Error("A forecast completed under superseded decisions.");
  }
  await clickButtonWithText(page, "Time");
  await setRangeValue(page, ".story-slider.year input", "2032");
  await clickButtonWithText(page, "Futures");

  await clickButtonWithText(page, "Simulate P10");
  await page.waitForSelector(".story-quantiles", { timeout: 60000 });
  const quantileCount = await page.$$eval(
    ".story-quantiles > div",
    (elements) => elements.length,
  );
  await screenshot(page, "04-futures");

  await clickButtonWithText(page, "Compare the two worlds");
  await page.waitForSelector(".story-outcome", { timeout: 5000 });
  await screenshot(page, "05-compare");

  const state = await page.evaluate(() => ({
    chapter: document.querySelector(".story-eyebrow")?.textContent,
    outcome: document.querySelector(".story-outcome")?.textContent.trim(),
    canvas: Boolean(document.querySelector(".story-app canvas")),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  console.log(JSON.stringify(
    { ...state, quantiles: quantileCount, errorCount: errors.length, errors },
    null,
    2,
  ));
  await browser.close();

  const passed = errors.length === 0
    && state.chapter?.startsWith("05")
    && quantileCount === 3
    && state.outcome
    && state.canvas
    && !state.horizontalOverflow;
  process.exit(passed ? 0 : 1);
})().catch((error) => {
  console.error("STORY E2E CRASH:", error);
  process.exit(2);
});
