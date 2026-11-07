import { expect, test } from "@playwright/test";

// Smoke test for Phase 1. The review-flow test is added in Phase 7.
test("navigates between all pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "ホーム" })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "メインメニュー" });
  for (const [label, path] of [
    ["学習", "/review"],
    ["一覧", "/browse"],
    ["統計", "/stats"],
    ["設定", "/settings"],
    ["ホーム", "/"],
  ] as const) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1, name: label })).toBeVisible();
  }
});
