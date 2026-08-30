// Playable site-to-futures browser test for the voxel story.
const path = require("path");
const puppeteer = require("puppeteer");

const appUrl = process.env.APP_URL || "http://127.0.0.1:5173/";
const storyUrl = process.env.STORY_URL || new URL("/story", appUrl).toString();
const staticStory = process.env.STATIC_STORY === "true";
const outputDir = process.env.SCREENSHOT_DIR || __dirname;
const mobileViewport = process.env.MOBILE_VIEWPORT === "true";
const viewportWidth = Number(process.env.VIEWPORT_WIDTH || 1600);
const viewportHeight = Number(process.env.VIEWPORT_HEIGHT || 900);
const deviceScaleFactor = Number(process.env.DEVICE_SCALE_FACTOR || 1);

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
  let staticCatalogLoaded = false;
  let forecastPostCount = 0;
  let collapsedPanelHeight = null;
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      `--window-size=${viewportWidth},${viewportHeight}`,
      "--ignore-gpu-blocklist",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor,
    isMobile: mobileViewport,
    hasTouch: mobileViewport,
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("request", (request) => {
    if (request.url().endsWith("/forecast") && request.method() === "POST") {
      forecastPostCount += 1;
    }
  });
  page.on("response", (response) => {
    if (
      response.url().endsWith("/story-data/outcomes.json")
      && response.ok()
    ) {
      staticCatalogLoaded = true;
    }
  });

  await page.goto(storyUrl, { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForSelector(".story-app canvas", { timeout: 15000 });
  await page.waitForSelector(".voxel-action", { timeout: 15000 });
  await screenshot(page, "01-site");

  if (mobileViewport) {
    await page.click(".story-primary");
  } else {
    await page.click(".voxel-action");
  }
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
  if (mobileViewport) {
    await page.click(".story-sheet-toggle");
    await page.waitForFunction(
      () => document.querySelector(".story-narrative")?.classList.contains(
        "sheet-collapsed",
      ),
    );
    collapsedPanelHeight = await page.$eval(
      ".story-narrative",
      (element) => element.getBoundingClientRect().height,
    );
    await screenshot(page, "03-world");
    await page.click(".story-sheet-toggle");
    await page.waitForFunction(
      () => document.querySelector(".story-narrative")?.classList.contains(
        "sheet-open",
      ),
    );
  }

  await clickButtonWithText(page, "Open possible futures");
  await page.waitForFunction(
    () => document.querySelector(".story-eyebrow")?.textContent.startsWith("04"),
  );

  if (!staticStory) {
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
  }

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

  const browserState = await page.evaluate(() => ({
    chapter: document.querySelector(".story-eyebrow")?.textContent,
    outcome: document.querySelector(".story-outcome")?.textContent.trim(),
    canvas: Boolean(document.querySelector(".story-app canvas")),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    coarsePointer: matchMedia("(pointer: coarse)").matches,
    canvasPixelRatio: (() => {
      const canvas = document.querySelector(".story-app canvas");
      if (!canvas) return null;
      return canvas.width / canvas.getBoundingClientRect().width;
    })(),
    minimumTouchTarget: Math.min(
      ...[...document.querySelectorAll(
        ".story-chapters button, .story-sheet-toggle",
      )]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return Math.min(rect.width, rect.height);
        }),
    ),
  }));
  const state = {
    ...browserState,
    collapsedPanelHeight,
    staticCatalogLoaded,
    forecastPostCount,
  };
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
    && !state.horizontalOverflow
    && (!staticStory || (state.staticCatalogLoaded && state.forecastPostCount === 0))
    && (!mobileViewport || (
      state.coarsePointer
      && state.collapsedPanelHeight <= 60
      && state.canvasPixelRatio <= 1.1
      && state.minimumTouchTarget >= 42
    ));
  process.exit(passed ? 0 : 1);
})().catch((error) => {
  console.error("STORY E2E CRASH:", error);
  process.exit(2);
});
