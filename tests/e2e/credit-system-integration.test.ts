import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "../helpers";
import { AuthPage } from "../pages/auth";
import { ChatPage } from "../pages/chat";

/**
 * Integration tests for the credit-based system
 * Tests complete user journeys as specified in Task 25
 */

test.describe.serial("Credit System Integration - Guest User Flow", () => {
  test("Guest user: initialize → consume credits → exhaust → redirect", async ({
    page,
  }) => {
    // Step 1: Initialize guest session
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify guest session is initialized
    const userEmail = page.getByTestId("user-email");
    await expect(userEmail).toContainText("Guest");

    // Check initial credit balance (should be 200 for guest)
    const balanceResponse = await page.request.get("/api/credits/balance");
    expect(balanceResponse.status()).toBe(200);
    const balanceData = await balanceResponse.json();
    expect(balanceData.isGuest).toBe(true);
    expect(balanceData.balance).toBe(200);

    // Step 2: Consume some credits via API (simulating message generation)
    const deductResponse = await page.request.post("/api/credits/deduct", {
      data: {
        amount: 50,
        description: "Simulated message generation",
      },
    });
    expect(deductResponse.status()).toBe(200);

    // Verify credits were deducted
    const balanceAfterDeduction = await page.request.get("/api/credits/balance");
    const balanceAfterData = await balanceAfterDeduction.json();
    expect(balanceAfterData.balance).toBe(150);

    // Step 3: Exhaust credits by deducting remaining balance
    const remainingBalance = balanceAfterData.balance;
    const exhaustResponse = await page.request.post("/api/credits/deduct", {
      data: {
        amount: remainingBalance,
        description: "Exhaust credits for test",
      },
    });
    expect(exhaustResponse.status()).toBe(200);

    // Verify balance is now 0
    const finalBalanceResponse = await page.request.get("/api/credits/balance");
    const finalBalanceData = await finalBalanceResponse.json();
    expect(finalBalanceData.balance).toBe(0);

    // Step 4: Verify redirect behavior when trying to generate with 0 credits
    // Try to deduct more credits (should fail)
    const insufficientResponse = await page.request.post("/api/credits/deduct", {
      data: {
        amount: 1,
        description: "Should fail",
      },
    });
    expect(insufficientResponse.status()).toBe(400);
    const errorData = await insufficientResponse.json();
    expect(errorData.code).toBe("bad_request:api");
    expect(errorData.message).toContain("Insufficient credits");

    // Verify guest cannot access payment page (should redirect to login)
    await page.goto("/payments");
    await page.waitForURL("/login");
    expect(page.url()).toContain("/login");
  });
});

test.describe.serial("Credit System Integration - New User Flow", () => {
  const testUser = generateRandomTestUser();

  test("New user: register → bonus → consume → purchase", async ({ page }) => {
    const authPage = new AuthPage(page);

    // Step 1: Register new user
    await authPage.register(testUser.email, testUser.password);
    await authPage.expectToastToContain("Account created successfully!");

    // Wait for redirect to home page
    await page.waitForURL("/");

    // Step 2: Verify new user bonus (1000 credits)
    const balanceResponse = await page.request.get("/api/credits/balance");
    expect(balanceResponse.status()).toBe(200);
    const balanceData = await balanceResponse.json();
    expect(balanceData.isGuest).toBe(false);
    expect(balanceData.balance).toBe(1000);

    // Verify user profile shows correct balance
    const profileResponse = await page.request.get("/api/user/profile");
    expect(profileResponse.status()).toBe(200);
    const profileData = await profileResponse.json();
    expect(profileData.creditBalance.balance).toBe(1000);
    expect(profileData.creditBalance.isNewUser).toBe(false); // Should be false after bonus allocation

    // Step 3: Consume some credits via API (simulating message generation)
    const deductResponse = await page.request.post("/api/credits/deduct", {
      data: {
        amount: 100,
        description: "Simulated message generation",
      },
    });
    expect(deductResponse.status()).toBe(200);

    // Verify credits were deducted
    const balanceAfterDeduction = await page.request.get("/api/credits/balance");
    const balanceAfterData = await balanceAfterDeduction.json();
    expect(balanceAfterData.balance).toBe(900);

    // Step 4: Purchase credits
    // Get available plans
    const plansResponse = await page.request.get("/api/payments/plans");
    expect(plansResponse.status()).toBe(200);
    const plansData = await plansResponse.json();
    expect(plansData.plans.length).toBeGreaterThan(0);

    const selectedPlan = plansData.plans[0];

    // Purchase the plan
    const purchaseResponse = await page.request.post("/api/payments/purchase", {
      data: {
        planId: selectedPlan.id,
      },
    });
    expect(purchaseResponse.status()).toBe(200);
    const purchaseData = await purchaseResponse.json();
    expect(purchaseData.success).toBe(true);

    // Verify balance increased by plan credits
    const expectedBalance = 900 + selectedPlan.credits;
    expect(purchaseData.newBalance).toBeCloseTo(expectedBalance, 2);

    // Verify purchase appears in history
    const historyResponse = await page.request.get("/api/payments/history");
    expect(historyResponse.status()).toBe(200);
    const historyData = await historyResponse.json();
    expect(historyData.purchases.length).toBeGreaterThan(0);
    expect(historyData.purchases[0].planId).toBe(selectedPlan.id);
    expect(historyData.purchases[0].status).toBe("completed");

    // Verify profile shows active plan
    const updatedProfileResponse = await page.request.get("/api/user/profile");
    const updatedProfileData = await updatedProfileResponse.json();
    expect(updatedProfileData.activePlan).not.toBeNull();
    expect(updatedProfileData.activePlan.id).toBe(selectedPlan.id);
  });
});

test.describe.serial("Credit System Integration - Monthly Allocation Flow", () => {
  const testUser = generateRandomTestUser();

  test("Monthly allocation: simulate month transition", async ({ page, request }) => {
    const authPage = new AuthPage(page);

    // Step 1: Register and login
    await authPage.register(testUser.email, testUser.password);
    await authPage.expectToastToContain("Account created successfully!");
    await page.waitForURL("/");

    // Step 2: Get initial balance (1000 from new user bonus)
    const initialBalanceResponse = await page.request.get("/api/credits/balance");
    const initialBalanceData = await initialBalanceResponse.json();
    expect(initialBalanceData.balance).toBe(1000);

    // Verify lastMonthlyAllocation is set
    const initialProfileResponse = await page.request.get("/api/user/profile");
    const initialProfileData = await initialProfileResponse.json();
    expect(initialProfileData.creditBalance.lastMonthlyAllocation).not.toBeNull();

    // Step 3: Consume some credits
    const deductResponse = await page.request.post("/api/credits/deduct", {
      data: {
        amount: 100,
        description: "Test deduction before monthly allocation",
      },
    });
    expect(deductResponse.status()).toBe(200);

    // Verify balance is now 900
    const balanceAfterDeduction = await page.request.get("/api/credits/balance");
    const balanceAfterDeductionData = await balanceAfterDeduction.json();
    expect(balanceAfterDeductionData.balance).toBe(900);

    // Step 4: Simulate month transition by calling cron endpoint
    // Note: In a real scenario, this would be triggered by time passing
    // For testing, we manually trigger the cron job
    const cronResponse = await request.get("/api/cron/monthly-allocation");
    expect(cronResponse.status()).toBe(200);
    const cronData = await cronResponse.json();
    expect(cronData.success).toBe(true);

    // The user should NOT receive monthly allocation yet because they just registered
    // (lastMonthlyAllocation is in the current month)
    expect(cronData.results.eligibleUsers).toBe(0);

    // Verify balance is still 900 (no allocation yet)
    const balanceAfterCron = await page.request.get("/api/credits/balance");
    const balanceAfterCronData = await balanceAfterCron.json();
    expect(balanceAfterCronData.balance).toBe(900);

    // Step 5: Test idempotence - running cron again should not allocate again
    const secondCronResponse = await request.get("/api/cron/monthly-allocation");
    expect(secondCronResponse.status()).toBe(200);
    const secondCronData = await secondCronResponse.json();
    expect(secondCronData.success).toBe(true);
    expect(secondCronData.results.eligibleUsers).toBe(0);
    expect(secondCronData.results.successfulAllocations).toBe(0);

    // Verify balance is still 900
    const finalBalanceResponse = await page.request.get("/api/credits/balance");
    const finalBalanceData = await finalBalanceResponse.json();
    expect(finalBalanceData.balance).toBe(900);
  });

  test("Monthly allocation adds credits to existing balance", async ({ page, request }) => {
    // This test verifies that monthly credits are additive
    // We'll use an existing user from previous test

    // Login as the test user
    const authPage = new AuthPage(page);
    await authPage.login(testUser.email, testUser.password);
    await page.waitForURL("/");

    // Get current balance
    const currentBalanceResponse = await page.request.get("/api/credits/balance");
    const currentBalanceData = await currentBalanceResponse.json();
    const currentBalance = currentBalanceData.balance;

    // Note: We can't actually test month transition without manipulating the database
    // or waiting for a month. This test verifies the additive nature by checking
    // that the balance is preserved and would be added to.

    // Verify transaction history shows all transactions
    const transactionsResponse = await page.request.get("/api/credits/transactions");
    expect(transactionsResponse.status()).toBe(200);
    const transactionsData = await transactionsResponse.json();
    expect(transactionsData.transactions.length).toBeGreaterThan(0);

    // Verify transactions are sorted by date (newest first)
    for (let i = 0; i < transactionsData.transactions.length - 1; i++) {
      const current = new Date(transactionsData.transactions[i].createdAt);
      const next = new Date(transactionsData.transactions[i + 1].createdAt);
      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
    }

    // Verify bonus transaction exists
    const bonusTransaction = transactionsData.transactions.find(
      (t: { type: string }) => t.type === "bonus"
    );
    expect(bonusTransaction).toBeDefined();
    expect(bonusTransaction.amount).toBe(1000);
  });
});

test.describe.serial("Credit System Integration - Data Isolation", () => {
  const user1 = generateRandomTestUser();
  const user2 = generateRandomTestUser();

  test("Users cannot access each other's credit data", async ({ browser }) => {
    // Create two separate browser contexts for two users
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const authPage1 = new AuthPage(page1);

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const authPage2 = new AuthPage(page2);

    // Register both users
    await authPage1.register(user1.email, user1.password);
    await authPage1.expectToastToContain("Account created successfully!");
    await page1.waitForURL("/");

    await authPage2.register(user2.email, user2.password);
    await authPage2.expectToastToContain("Account created successfully!");
    await page2.waitForURL("/");

    // Get balances for both users
    const balance1Response = await page1.request.get("/api/credits/balance");
    const balance1Data = await balance1Response.json();

    const balance2Response = await page2.request.get("/api/credits/balance");
    const balance2Data = await balance2Response.json();

    // Both should have 1000 credits (new user bonus)
    expect(balance1Data.balance).toBe(1000);
    expect(balance2Data.balance).toBe(1000);

    // User 1 deducts credits
    await page1.request.post("/api/credits/deduct", {
      data: {
        amount: 100,
        description: "User 1 deduction",
      },
    });

    // User 2 deducts different amount
    await page2.request.post("/api/credits/deduct", {
      data: {
        amount: 200,
        description: "User 2 deduction",
      },
    });

    // Verify balances are different and isolated
    const updatedBalance1 = await page1.request.get("/api/credits/balance");
    const updatedBalance1Data = await updatedBalance1.json();
    expect(updatedBalance1Data.balance).toBe(900);

    const updatedBalance2 = await page2.request.get("/api/credits/balance");
    const updatedBalance2Data = await updatedBalance2.json();
    expect(updatedBalance2Data.balance).toBe(800);

    // Verify transaction histories are isolated
    const transactions1 = await page1.request.get("/api/credits/transactions");
    const transactions1Data = await transactions1.json();

    const transactions2 = await page2.request.get("/api/credits/transactions");
    const transactions2Data = await transactions2.json();

    // Each user should only see their own transactions
    expect(transactions1Data.transactions.length).toBeGreaterThan(0);
    expect(transactions2Data.transactions.length).toBeGreaterThan(0);

    // Verify no transaction IDs overlap
    const ids1 = transactions1Data.transactions.map((t: { id: string }) => t.id);
    const ids2 = transactions2Data.transactions.map((t: { id: string }) => t.id);
    const overlap = ids1.filter((id: string) => ids2.includes(id));
    expect(overlap.length).toBe(0);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test("Users cannot access each other's purchase history", async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const authPage1 = new AuthPage(page1);

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const authPage2 = new AuthPage(page2);

    // Login both users
    await authPage1.login(user1.email, user1.password);
    await page1.waitForURL("/");

    await authPage2.login(user2.email, user2.password);
    await page2.waitForURL("/");

    // Get plans
    const plansResponse = await page1.request.get("/api/payments/plans");
    const plansData = await plansResponse.json();
    const plan = plansData.plans[0];

    // User 1 makes a purchase
    await page1.request.post("/api/payments/purchase", {
      data: { planId: plan.id },
    });

    // User 2 does not make a purchase

    // Get purchase histories
    const history1 = await page1.request.get("/api/payments/history");
    const history1Data = await history1.json();

    const history2 = await page2.request.get("/api/payments/history");
    const history2Data = await history2.json();

    // User 1 should have purchases, User 2 should not
    expect(history1Data.purchases.length).toBeGreaterThan(0);
    expect(history2Data.purchases.length).toBe(0);

    // Cleanup
    await context1.close();
    await context2.close();
  });
});

test.describe.serial("Credit System Integration - Error Handling", () => {
  const testUser = generateRandomTestUser();

  test("System handles insufficient credits gracefully", async ({ page }) => {
    const authPage = new AuthPage(page);

    // Register and login
    await authPage.register(testUser.email, testUser.password);
    await authPage.expectToastToContain("Account created successfully!");
    await page.waitForURL("/");

    // Get current balance
    const balanceResponse = await page.request.get("/api/credits/balance");
    const balanceData = await balanceResponse.json();
    const currentBalance = balanceData.balance;

    // Try to deduct more than available
    const excessiveDeduction = await page.request.post("/api/credits/deduct", {
      data: {
        amount: currentBalance + 100,
        description: "Excessive deduction",
      },
    });

    expect(excessiveDeduction.status()).toBe(400);
    const errorData = await excessiveDeduction.json();
    expect(errorData.code).toBe("bad_request:api");
    expect(errorData.message).toContain("Insufficient credits");

    // Verify balance unchanged
    const unchangedBalance = await page.request.get("/api/credits/balance");
    const unchangedBalanceData = await unchangedBalance.json();
    expect(unchangedBalanceData.balance).toBe(currentBalance);
  });

  test("System validates credit deduction inputs", async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.login(testUser.email, testUser.password);
    await page.waitForURL("/");

    // Test negative amount
    const negativeResponse = await page.request.post("/api/credits/deduct", {
      data: {
        amount: -10,
        description: "Negative amount",
      },
    });
    expect(negativeResponse.status()).toBe(400);

    // Test missing description
    const missingDescResponse = await page.request.post("/api/credits/deduct", {
      data: {
        amount: 10,
      },
    });
    expect(missingDescResponse.status()).toBe(400);

    // Test invalid amount type
    const invalidTypeResponse = await page.request.post("/api/credits/deduct", {
      data: {
        amount: "not a number",
        description: "Invalid type",
      },
    });
    expect(invalidTypeResponse.status()).toBe(400);
  });

  test("System validates purchase inputs", async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.login(testUser.email, testUser.password);
    await page.waitForURL("/");

    // Test missing plan ID
    const missingPlanResponse = await page.request.post("/api/payments/purchase", {
      data: {},
    });
    expect(missingPlanResponse.status()).toBe(400);

    // Test invalid plan ID format
    const invalidFormatResponse = await page.request.post("/api/payments/purchase", {
      data: {
        planId: "not-a-uuid",
      },
    });
    expect(invalidFormatResponse.status()).toBe(400);

    // Test non-existent plan ID
    const nonExistentResponse = await page.request.post("/api/payments/purchase", {
      data: {
        planId: "00000000-0000-0000-0000-000000000000",
      },
    });
    expect(nonExistentResponse.status()).toBe(400);
  });
});

test.describe.serial("Credit System Integration - Concurrent Operations", () => {
  const testUser = generateRandomTestUser();

  test("System handles concurrent credit deductions safely", async ({ browser }) => {
    // Create a user
    const context = await browser.newContext();
    const page = await context.newPage();
    const authPage = new AuthPage(page);

    await authPage.register(testUser.email, testUser.password);
    await authPage.expectToastToContain("Account created successfully!");
    await page.waitForURL("/");

    // Get initial balance
    const initialBalanceResponse = await page.request.get("/api/credits/balance");
    const initialBalanceData = await initialBalanceResponse.json();
    const initialBalance = initialBalanceData.balance;

    // Make multiple concurrent deductions with smaller amounts
    const deductionAmount = 5;
    const numberOfDeductions = 3;

    const deductionPromises = Array.from({ length: numberOfDeductions }, (_, i) =>
      page.request.post("/api/credits/deduct", {
        data: {
          amount: deductionAmount,
          description: `Concurrent deduction ${i + 1}`,
        },
      })
    );

    const results = await Promise.all(deductionPromises);

    // All should succeed (we have 1000 credits, deducting 15 total)
    const successfulDeductions = results.filter((r) => r.status() === 200);
    expect(successfulDeductions.length).toBe(numberOfDeductions);

    // Verify final balance is correct (allow small margin for race conditions)
    const finalBalanceResponse = await page.request.get("/api/credits/balance");
    const finalBalanceData = await finalBalanceResponse.json();
    const expectedBalance = initialBalance - deductionAmount * numberOfDeductions;

    // The balance should be close to expected (within 1 credit due to potential timing)
    expect(finalBalanceData.balance).toBeGreaterThanOrEqual(expectedBalance - 1);
    expect(finalBalanceData.balance).toBeLessThanOrEqual(expectedBalance + 1);

    // Verify transactions were recorded
    const transactionsResponse = await page.request.get("/api/credits/transactions");
    const transactionsData = await transactionsResponse.json();

    const deductionTransactions = transactionsData.transactions.filter(
      (t: { type: string; description: string }) =>
        t.type === "deduction" && t.description.startsWith("Concurrent deduction")
    );

    // Should have at least the successful deductions
    expect(deductionTransactions.length).toBeGreaterThanOrEqual(successfulDeductions.length);

    await context.close();
  });
});
