import { expect, test, type Page } from "@playwright/test";
const photo = {
  name: "condition.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6SAAAAABJRU5ErkJggg==",
    "base64",
  ),
};
async function switchAccount(page: Page, name: string) {
  await page.goto("/profile");
  await page.getByRole("button", { name, exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: `${name} · current account`,
      exact: true,
    }),
  ).toBeDisabled();
}
async function upload(page: Page) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await (await chooser).setFiles(photo);
  await expect(
    page.getByRole("button", { name: "Remove photo", exact: true }),
  ).toBeVisible();
}
test("renter and owner complete a rental, exchange messages, upload evidence and review", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Big plans.")).toBeVisible();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "Save Sony A7 III Mirrorless Camera",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "View Sony A7 III Mirrorless Camera",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Request to rent", exact: true })
    .click();
  await expect(
    page.getByText("Waiting for owner approval", { exact: true }),
  ).toBeVisible();
  const rentalUrl = page.url();
  await page.reload();
  await expect(
    page.getByText("Waiting for owner approval", { exact: true }),
  ).toBeVisible();
  await switchAccount(page, "Aiman Rahman");
  await page.goto(rentalUrl);
  await page
    .getByRole("button", { name: "Approve request", exact: true })
    .click();
  await expect(
    page.getByText(
      "Approved. Waiting for the renter to complete demo checkout.",
    ),
  ).toBeVisible();
  await switchAccount(page, "Alex Tan");
  await page.goto(rentalUrl);
  await page.getByRole("button", { name: /Pay RM.*demo/ }).click();
  await page
    .getByRole("button", { name: "Simulate failed payment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry demo payment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate successful payment", exact: true })
    .click();
  await expect(
    page.getByText("Digital rental agreement", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Message Aiman", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Can we meet at noon?");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("Can we meet at noon?", { exact: true }),
  ).toBeVisible();
  await switchAccount(page, "Aiman Rahman");
  await page.goto(rentalUrl);
  await upload(page);
  await page
    .getByRole("textbox", { name: "Condition notes", exact: true })
    .fill("Camera and lens in good condition.");
  await page
    .getByRole("button", { name: "Confirm handover & check-in", exact: true })
    .click();
  await expect(
    page.getByText("The item is with the renter.", { exact: false }),
  ).toBeVisible();
  await switchAccount(page, "Alex Tan");
  await page.goto(rentalUrl);
  await upload(page);
  await page
    .getByRole("button", { name: "Submit return & check-out", exact: true })
    .click();
  await expect(
    page.getByText("Waiting for the owner to inspect the item", {
      exact: false,
    }),
  ).toBeVisible();
  await switchAccount(page, "Aiman Rahman");
  await page.goto(rentalUrl);
  await page
    .getByRole("button", {
      name: "Confirm return & release demo deposit",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Demo payout recorded", { exact: true }),
  ).toBeVisible();
  await switchAccount(page, "Alex Tan");
  await page.goto(rentalUrl);
  await page
    .getByRole("textbox", { name: "Your review", exact: true })
    .fill("Smooth pickup and a great camera.");
  await page
    .getByRole("button", { name: "Leave 5-star review", exact: true })
    .click();
  await expect(
    page.getByText("Smooth pickup and a great camera.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("released", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile marketplace search, favourites and owner listing creation work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByText("Big plans.")).toBeVisible();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page
    .getByText("Good finds, close to home", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/marketplace-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "Search rentals", exact: true })
    .fill("camera");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByText("1 finds for you", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Save Sony A7 III Mirrorless Camera",
      exact: true,
    })
    .click();
  await page.goto("/explore?saved=1");
  await expect(
    page.getByText("1 finds for you", { exact: true }),
  ).toBeVisible();
  await page.goto("/owner/edit");
  await page
    .getByRole("textbox", { name: "Listing title", exact: true })
    .fill("Weekend Camera Kit");
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("A complete camera kit with a lens, charger and carry case.");
  await page
    .getByRole("textbox", { name: "Pickup location", exact: true })
    .fill("Petaling Jaya");
  await page
    .getByRole("textbox", { name: "Daily rental price (RM)", exact: true })
    .fill("50");
  await page
    .getByRole("textbox", {
      name: "Estimated replacement value (RM)",
      exact: true,
    })
    .fill("3000");
  await page
    .getByRole("button", { name: "Publish listing", exact: true })
    .click();
  await expect(
    page.getByText("Add at least one photo before publishing.", {
      exact: true,
    }),
  ).toBeVisible();
  await upload(page);
  await page
    .getByRole("button", { name: "Publish listing", exact: true })
    .click();
  await page.getByRole("button", { name: "Listings", exact: true }).click();
  await expect(
    page.getByText("Weekend Camera Kit", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause listing", exact: true })
    .click();
  await expect(page.getByText("paused", { exact: true })).toBeVisible();
});
test("local signup, failed verification, retry and sign-in persist", async ({
  page,
}) => {
  await page.goto("/auth");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Full name", exact: true })
    .fill("Jamie Demo");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("jamie@example.test");
  await page
    .getByRole("textbox", { name: "Demo password", exact: true })
    .fill("unique-test-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Start demo verification", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate failed result", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry demo verification", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate verified result", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/auth");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("jamie@example.test");
  await page
    .getByRole("textbox", { name: "Demo password", exact: true })
    .fill("unique-test-password");
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(page.getByText("Jamie Demo", { exact: true })).toBeVisible();
  await expect(
    page.getByText("verified · demo", { exact: true }),
  ).toBeVisible();
});
