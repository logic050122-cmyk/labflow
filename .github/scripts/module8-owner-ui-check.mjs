import fs from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });

await page.addInitScript((token) => {
  localStorage.setItem("labflow_token", token);
}, process.env.OWNER_TOKEN);

await page.goto(`http://127.0.0.1:5173/projects/${process.env.PROJECT_ID}`);
await page.getByRole("heading", { name: "学生实训项目9" }).waitFor();

const taskRow = page.getByRole("row").filter({ hasText: "校验" });
await taskRow.getByRole("button", { name: "详情" }).click();

const dialog = page.getByRole("dialog");
await dialog.waitFor();
await dialog.getByText("任务评论", { exact: true }).waitFor();
await dialog.getByText("7785623", { exact: true }).waitFor();

const deleteButton = dialog.getByRole("button", { name: "删除" });
await deleteButton.waitFor();

const result = await page.evaluate(() => {
  const dialogElement = document.querySelector('[role="dialog"]');
  const title = Array.from(document.querySelectorAll(".el-divider__text"))
    .find((element) => element.textContent?.trim() === "任务评论");
  const deleteElement = Array.from(document.querySelectorAll("button"))
    .find((element) => element.textContent?.trim() === "删除");
  const overlay = document.querySelector(".el-overlay-dialog");
  const body = dialogElement?.querySelector(".el-dialog__body");

  const box = (element) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      fullyInViewport: rect.top >= 0 && rect.bottom <= window.innerHeight
    };
  };

  return {
    viewportHeight: window.innerHeight,
    dialog: box(dialogElement),
    commentTitle: box(title),
    deleteButton: box(deleteElement),
    overlay: overlay ? {
      scrollHeight: overlay.scrollHeight,
      clientHeight: overlay.clientHeight,
      overflowY: getComputedStyle(overlay).overflowY
    } : null,
    body: body ? {
      scrollHeight: body.scrollHeight,
      clientHeight: body.clientHeight,
      overflowY: getComputedStyle(body).overflowY
    } : null
  };
});

console.log(`OWNER_UI_RESULT=${JSON.stringify(result)}`);
await fs.writeFile("owner-ui-result.json", JSON.stringify(result, null, 2));
await page.screenshot({ path: "owner-dialog-900x900.png" });
await browser.close();
