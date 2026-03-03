import { test, expect } from "@playwright/test";
import * as fs from "fs/promises";

const OTP_FILE = "/tmp/quorumos-e2e-otp.json";

test.describe("Voter flow", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /QuorumOS/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Cast Vote/i })).toBeVisible();
  });

  test("vote page shows elections or empty state", async ({ page }) => {
    await page.goto("/vote");
    await expect(page.getByRole("heading", { name: /Cast Your Vote/i })).toBeVisible();
    await expect(page.getByText(/Select an open election|No open elections/).first()).toBeVisible();
  });

  test("verify page loads", async ({ page }) => {
    await page.goto("/verify");
    await expect(page.getByRole("heading", { name: /Verify Election Results/i })).toBeVisible();
  });
});

test.describe("Admin flow", () => {
  test("admin page loads and can create election", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /Election Control Center/i })).toBeVisible();

    await page.getByRole("link", { name: /New Election/i }).click();
    await expect(page).toHaveURL(/\/admin\/new/, { timeout: 5000 });

    await page.getByLabel(/Election name/i).fill("E2E Test Election");
    await page.getByRole("button", { name: /Create Election/i }).click();

    await expect(page).toHaveURL(/\/admin\/[a-z0-9]+/, { timeout: 5000 });
    await expect(page.getByText("E2E Test Election")).toBeVisible();
  });
});

test.describe("Full voter flow with OTP", () => {
  test.skip(
    ({ page }) => !process.env.DATABASE_URL,
    "Requires DATABASE_URL and pre-seeded election"
  );

  test("complete vote flow when election exists", async ({ page }) => {
    await page.goto("/vote");

    const electionButtons = page.getByRole("button", { name: /Select election:/ });
    const count = await electionButtons.count();
    if (count === 0) {
      test.skip(true, "No open elections - seed data required");
      return;
    }

    await electionButtons.first().click();

    await page.getByLabel("Flat number").fill("101");
    await page.getByLabel("Email address").fill("voter@test.example");
    await page.getByRole("button", { name: /Send OTP/i }).click();

    await expect(page.getByText(/Enter the 6-digit code/i)).toBeVisible({ timeout: 5000 });

    let otp = "000000";
    try {
      const data = await fs.readFile(OTP_FILE, "utf8");
      const parsed = JSON.parse(data);
      otp = parsed.otp;
    } catch {
      test.skip(true, "Could not read OTP file - check TEST_OTP_FILE");
      return;
    }

    await page.getByLabel("6-digit verification code").fill(otp);
    await page.getByRole("button", { name: /Verify/i }).click();

    await expect(page.getByText(/Select your choice/i)).toBeVisible({ timeout: 5000 });

    const candidateButtons = page.getByRole("button", { name: /Vote for/ });
    if ((await candidateButtons.count()) > 0) {
      await candidateButtons.first().click();
      await page.getByRole("button", { name: /Submit vote/i }).click();
      await expect(page.getByText(/Vote recorded/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
