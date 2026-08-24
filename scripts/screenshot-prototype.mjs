// Renders prototypes/rule-ticks.html headlessly and screenshots one tab's
// stage element, for docs/images/*.png. See CLAUDE.md's prototype-first workflow.
//
// Usage: node scripts/screenshot-prototype.mjs <bar|tooltip|panel> <output-path> [--uncheck id1,id2]
// --uncheck unchecks the given prototype checkbox ids (e.g. showModel,showSeverityTag)
// before capturing, for screenshots of a non-default toggle state.
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const TABS = {
  bar: "#panel-bar .barwrap",
  tooltip: "#panel-tooltip .tooltip-stage",
  panel: "#panel-panel .panel-stage",
};

const [, , tab, outPath, ...rest] = process.argv;
if (!TABS[tab] || !outPath) {
  console.error(
    `Usage: node scripts/screenshot-prototype.mjs <${Object.keys(TABS).join("|")}> <output-path> [--uncheck id1,id2]`
  );
  process.exit(1);
}

let uncheckIds = [];
const uncheckFlagIndex = rest.indexOf("--uncheck");
if (uncheckFlagIndex !== -1 && rest[uncheckFlagIndex + 1]) {
  uncheckIds = rest[uncheckFlagIndex + 1].split(",");
}

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const protoPath = path.join(repoRoot, "prototypes", "rule-ticks.html");

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setViewportSize({ width: 900, height: 1000 });
await page.goto("file://" + protoPath);
await page.click(`[data-tab="${tab}"]`);
for (const id of uncheckIds) {
  await page.uncheck(`#${id}`);
}
await page.waitForTimeout(150);
await page.locator(TABS[tab]).screenshot({ path: path.resolve(outPath) });
await browser.close();
console.log("saved", outPath);
