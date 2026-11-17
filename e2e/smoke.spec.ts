// @ts-nocheck
// NOTE: These tests require the dev server to be running first.
//       Run `npm run dev` in a separate terminal before executing `npm run e2e`.

import { test, expect } from "playwright/test";

test.describe("Auth page", () => {
  test("loads and shows login heading", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();
  });

  test("mode switch shows signup heading", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /ليس لديك حساب/ }).click();
    await expect(page.getByRole("heading", { name: "إنشاء حساب" })).toBeVisible();
  });

  test("forgot password button is visible on login form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("button", { name: "نسيت كلمة المرور؟" })).toBeVisible();
  });

  test("forgot password mode shows reset form", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "نسيت كلمة المرور؟" }).click();
    await expect(page.getByRole("heading", { name: "استعادة كلمة المرور" })).toBeVisible();
    await expect(page.getByRole("button", { name: "إرسال رابط الاستعادة" })).toBeVisible();
  });
});

test.describe("Auth guard", () => {
  test("unauthenticated /app redirects to /auth", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/auth/);
  });
});
