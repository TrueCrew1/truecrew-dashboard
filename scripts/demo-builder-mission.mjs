import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const OUT = "/opt/cursor/artifacts";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForSelector("#chief-tab-approvals");

await page.locator("#chief-tab-approvals").click();
await page.waitForSelector(".chief-approval-card");

const buildCard = page.locator(".chief-approval-card", {
  hasText: "Build: Code change merging to main",
});
await buildCard.waitFor({ state: "visible" });
await buildCard.scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}/demo_mission_01_before_approve.png`, fullPage: false });

const approveBtn = buildCard.getByRole("button", { name: /^Approve$/ });
await approveBtn.click();

// Progressive lifecycle: queued (~450ms) then running (~700ms) then completed
await page.waitForTimeout(200);
await buildCard.screenshot({ path: `${OUT}/demo_mission_02_queued_or_running.png` });

await page.waitForTimeout(1400);
await buildCard.screenshot({ path: `${OUT}/demo_mission_03_completed_on_card.png` });

const missionBadge = buildCard.locator(".badge", { hasText: /Mission completed/i });
await missionBadge.waitFor({ state: "visible", timeout: 5000 });

await page.locator("#chief-tab-agents").click();
await page.waitForSelector(".agent-work-board");
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/demo_mission_04_agents_board.png`, fullPage: false });

const missionNote = page.locator(".agent-work-board-note--missions");
await missionNote.waitFor({ state: "visible", timeout: 5000 });
await missionNote.screenshot({ path: `${OUT}/demo_mission_05_session_rollup.png` });

console.log("Demo screenshots written to", OUT);
await browser.close();
