import { getMessageByErrorCode } from "@/lib/errors";
import { expect, test } from "../fixtures";

test.describe.serial("/api/user/profile", () => {
  test("Ada can retrieve her user profile", async ({ adaContext }) => {
    const response = await adaContext.request.get("/api/user/profile");
    expect(response.status()).toBe(200);

    const data = await response.json();
    
    // Verify user data
    expect(data).toHaveProperty("user");
    expect(data.user).toHaveProperty("id");
    expect(data.user).toHaveProperty("email");
    expect(data.user.email).toContain("@playwright.com");

    // Verify credit balance data
    expect(data).toHaveProperty("creditBalance");
    expect(data.creditBalance).toHaveProperty("balance");
    expect(data.creditBalance).toHaveProperty("lastMonthlyAllocation");
    expect(data.creditBalance).toHaveProperty("isNewUser");
    expect(data.creditBalance).toHaveProperty("createdAt");
    expect(data.creditBalance).toHaveProperty("updatedAt");
    expect(typeof data.creditBalance.balance).toBe("number");

    // Verify active plan (may be null if no purchases)
    expect(data).toHaveProperty("activePlan");
  });

  test("Ada's profile shows active plan after purchase", async ({
    adaContext,
  }) => {
    // Get available plans
    const plansResponse = await adaContext.request.get("/api/payments/plans");
    const { plans } = await plansResponse.json();
    const selectedPlan = plans[0];

    // Make a purchase
    await adaContext.request.post("/api/payments/purchase", {
      data: { planId: selectedPlan.id },
    });

    // Get profile
    const response = await adaContext.request.get("/api/user/profile");
    expect(response.status()).toBe(200);

    const data = await response.json();
    
    // Verify active plan is present
    expect(data.activePlan).not.toBeNull();
    expect(data.activePlan.id).toBe(selectedPlan.id);
    expect(data.activePlan.name).toBe(selectedPlan.name);
    expect(data.activePlan.credits).toBe(selectedPlan.credits);
    expect(data.activePlan.price).toBe(selectedPlan.price);
    expect(data.activePlan).toHaveProperty("purchasedAt");
  });

  test("Babbage cannot access Ada's profile", async ({
    adaContext,
    babbageContext,
  }) => {
    // Get Ada's profile
    const adaResponse = await adaContext.request.get("/api/user/profile");
    const adaData = await adaResponse.json();

    // Get Babbage's profile
    const babbageResponse = await babbageContext.request.get(
      "/api/user/profile"
    );
    const babbageData = await babbageResponse.json();

    // Both should succeed
    expect(adaResponse.status()).toBe(200);
    expect(babbageResponse.status()).toBe(200);

    // But they should have different user IDs and emails
    expect(adaData.user.id).not.toBe(babbageData.user.id);
    expect(adaData.user.email).not.toBe(babbageData.user.email);
  });

  test("Profile reflects credit balance changes", async ({ adaContext }) => {
    // Get initial profile
    const initialResponse = await adaContext.request.get("/api/user/profile");
    const initialData = await initialResponse.json();
    const initialBalance = initialData.creditBalance.balance;

    // Deduct some credits
    const deductAmount = 10.5;
    await adaContext.request.post("/api/credits/deduct", {
      data: {
        amount: deductAmount,
        description: "Test deduction for profile",
      },
    });

    // Get updated profile
    const updatedResponse = await adaContext.request.get("/api/user/profile");
    const updatedData = await updatedResponse.json();
    const updatedBalance = updatedData.creditBalance.balance;

    // Verify balance decreased
    expect(updatedBalance).toBeLessThan(initialBalance);
    expect(updatedBalance).toBeCloseTo(initialBalance - deductAmount, 2);
  });

  test("Profile shows most recent purchase as active plan", async ({
    adaContext,
  }) => {
    // Get available plans
    const plansResponse = await adaContext.request.get("/api/payments/plans");
    const { plans } = await plansResponse.json();

    // Purchase first plan
    const firstPlan = plans[0];
    await adaContext.request.post("/api/payments/purchase", {
      data: { planId: firstPlan.id },
    });

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Purchase second plan (if available)
    if (plans.length > 1) {
      const secondPlan = plans[1];
      await adaContext.request.post("/api/payments/purchase", {
        data: { planId: secondPlan.id },
      });

      // Get profile
      const response = await adaContext.request.get("/api/user/profile");
      const data = await response.json();

      // Active plan should be the most recent purchase (second plan)
      expect(data.activePlan.id).toBe(secondPlan.id);
    }
  });
});
