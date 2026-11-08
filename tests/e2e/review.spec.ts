import { expect, test, type Page } from "@playwright/test";

const NOTICE = "解説は公式のものではありません。";

/** The remaining new-card count shown at the top of the review page. */
async function newCount(page: Page): Promise<number> {
  const text = await page.getByLabel("残り").innerText();
  return Number(/新規 (\d+)/.exec(text)?.[1]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("review flow: reveal, rate, persist after reload, undo", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "学習を始める" }).click();
  await expect(page).toHaveURL("/review");

  // The front: the answer stays hidden until it is revealed.
  const reveal = page.getByRole("button", { name: "答えを見る" });
  await expect(reveal).toBeVisible();
  const start = await newCount(page);
  expect(start).toBeGreaterThan(0);
  await expect(page.getByRole("region", { name: "正答" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "評価" })).toHaveCount(0);
  await expectNoHorizontalScroll(page);

  // The back: answer, notice and the four ratings with their intervals.
  await reveal.click();
  await expect(page.getByRole("region", { name: "正答" })).toBeVisible();
  await expect(page.getByText(NOTICE)).toBeVisible();
  const ratings = page.getByRole("group", { name: "評価" }).getByRole("button");
  await expect(ratings).toHaveCount(4);
  await expectNoHorizontalScroll(page);
  await ratings.filter({ hasText: "簡単" }).click();

  // The next card starts on its front, and the rating is counted.
  await expect(reveal).toBeVisible();
  await expect.poll(() => newCount(page)).toBe(start - 1);

  // Ratings survive a reload.
  await page.reload();
  await expect(reveal).toBeVisible();
  expect(await newCount(page)).toBe(start - 1);

  // Undo restores the previous state.
  await reveal.click();
  await page.getByRole("group", { name: "評価" }).getByRole("button").filter({ hasText: "正解" }).click();
  await expect.poll(() => newCount(page)).toBe(start - 2);
  await page.getByRole("button", { name: "元に戻す" }).first().click();
  await expect(page.getByText("直前の評価を取り消しました。")).toBeVisible();
  expect(await newCount(page)).toBe(start - 1);

  // Home agrees.
  await page.getByRole("navigation", { name: "メインメニュー" }).getByRole("link", { name: "ホーム" }).click();
  await expect(page.locator("dl dd").first()).toHaveText(String(start - 1));
});

test("review flow by keyboard alone", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "学習を始める" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "答えを見る" })).toBeVisible();
  const start = await newCount(page);

  for (const key of ["4", "3"]) {
    await page.keyboard.press("Space");
    await expect(page.getByRole("region", { name: "正答" })).toBeVisible();
    await page.keyboard.press(key);
    await expect(page.getByRole("button", { name: "答えを見る" })).toBeVisible();
  }
  await expect.poll(() => newCount(page)).toBe(start - 2);

  // Every control is reachable with Tab, e.g. undo.
  await page.getByRole("button", { name: "元に戻す" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("直前の評価を取り消しました。")).toBeVisible();
});

test("studies offline after the first load", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);

  await page.goto("/review");
  await page.getByRole("button", { name: "答えを見る" }).click();
  await page.getByRole("group", { name: "評価" }).getByRole("button").filter({ hasText: "簡単" }).click();
  await expect(page.getByRole("button", { name: "答えを見る" })).toBeVisible();

  // A large 別冊 figure loads offline too.
  await page.goto("/browse");
  await page.getByPlaceholder(/キーワード/).fill("ph-107-AM-30");
  await page.getByRole("button", { name: /保健師 第107回 午前 問30/ }).click();
  const figure = page.getByRole("img").first();
  await expect(figure).toBeVisible();
  await expect.poll(() => figure.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);

  // The sources stay available offline.
  await page.goto("/settings");
  await expect(page.getByText("出典・ライセンス")).toBeVisible();
});
