const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const file = process.argv[2];
  const out = process.argv[3];
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await page.goto("file://" + path.resolve(file), { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: out });
  await browser.close();
  console.log("rendered -> " + out);
})();
