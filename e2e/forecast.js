// Browser-level forecast workflow and visual smoke test.
const path = require("path");
const puppeteer = require("puppeteer");

const appUrl = process.env.APP_URL || "http://127.0.0.1:5173/";
const outputDir = process.env.SCREENSHOT_DIR || __dirname;

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

  await page.goto(appUrl, { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForSelector(".center canvas", { timeout: 15000 });
  await page.waitForFunction(
    () => Boolean(window.useStore?.getState().forecastRequest),
    { timeout: 15000 },
  );
  await page.evaluate(() => {
    const state = window.useStore.getState();
    const request = structuredClone(state.forecastRequest);
    request.sample_count = 32;
    request.scenario.horizon_years = 1;
    request.baseline.horizon_years = 1;
    state.setForecastRequest(request);
  });
  await page.evaluate(() => {
    const button = [...document.querySelectorAll(".right .tabs button")]
      .find((element) => element.textContent === "Forecast");
    button.click();
  });
  await page.waitForSelector(".forecast-status", { timeout: 5000 });
  await page.screenshot({
    path: path.join(outputDir, "forecast-v0.1-inputs.png"),
  });

  await page.click(".forecast-run");
  await page.waitForSelector(".forecast-results", { timeout: 30000 });
  await page.waitForFunction(
    () => Boolean(window.useStore?.getState().forecastResult),
    { timeout: 5000 },
  );
  await page.$eval(".right .panel-scroll", (element) => {
    element.scrollTop = element.scrollHeight;
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.screenshot({
    path: path.join(outputDir, "forecast-v0.1-results.png"),
  });

  const state = await page.evaluate(() => {
    const result = window.useStore.getState().forecastResult;
    return {
      runId: result?.run_id,
      periods: result?.scenario.periods.length,
      horizons: result?.scenario.horizons.length,
      calibration: result?.provenance.calibration_status,
      chart: Boolean(document.querySelector(".forecast-chart")),
      drivers: document.querySelectorAll(".forecast-driver").length,
    };
  });
  console.log(JSON.stringify({ ...state, errorCount: errors.length, errors }, null, 2));
  await browser.close();

  const passed = errors.length === 0
    && state.runId
    && state.periods === 12
    && state.horizons === 1
    && state.calibration === "uncalibrated"
    && state.chart
    && state.drivers > 0;
  process.exit(passed ? 0 : 1);
})().catch((error) => {
  console.error("FORECAST E2E CRASH:", error);
  process.exit(2);
});
