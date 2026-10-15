import { expect, test } from "@playwright/test";

test("signed-out visitors explore Home then reach Sign In from Profile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Rent what you need.", { exact: false }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Profile" }).click();
  await expect(
    page.getByRole("button", { name: "Log In", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign Up", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Email Address", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "Password", exact: true }),
  ).toHaveValue("");
});

test("signed-out entry remains usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByText("Rent what you need.", { exact: false }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Profile" }).click();
  await expect(page.getByRole("button", { name: "Log In", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign Up", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test("Sign Up presents real-registration fields without creating a test account", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByText("Sign Up", { exact: true }).click();

  await expect(
    page.getByText("Create your account", { exact: true }),
  ).toBeVisible();
  for (const label of ["Full Name", "Email Address", "Mobile Number", "Password", "Demo OTP"]) {
    await expect(page.getByRole("textbox", { name: label, exact: true })).toHaveValue("");
  }
  await expect(page.getByText("Simulated OTP — no SMS sent")).toBeVisible();
});
