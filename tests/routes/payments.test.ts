import { getMessageByErrorCode } from "@/lib/errors";
import { expect, test } from "../fixtures";

let testPlanId: string;

test.describe.serial("/api/payments", () => {
  test("Anyone can retrieve available subscription plans", async ({
    adaContext,
  }) => {
    const response = await adaContext.request.get("/api/payments/plans");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("plans");
    expect(Array.isArray(data.plans)).toBe(true);
    expect(data.plans.length).toBeGreaterThan(0);

    // Verify plan structure
    const plan = data.plans[0];
    expect(plan).toHaveProperty("id");
    expect(plan).toHaveProperty("name");
    expect(plan).toHaveProperty("credits");
    expect(plan).toHaveProperty("price");
    expect(plan).toHaveProperty("description");

    // Verify plans are sorted by credit amount
    for (let i = 0; i < data.plans.length - 1; i++) {
      expect(data.plans[i].credits).toBeLessThanOrEqual(
        data.plans[i + 1].credits
      );
    }

    // Store a plan ID for later tests
    testPlanId = data.plans[0].id;
  });

  test("Ada cannot purchase without plan ID", async ({ adaContext }) => {
    const response = await adaContext.request.post("/api/payments/purchase", {
      data: {},
    });
    expect(response.status()).toBe(400);

    const { code, message } = await response.json();
    expect(code).toEqual("bad_request:api");
    expect(message).toContain("Invalid request body");
  });

  test("Ada cannot purchase with invalid plan ID", async ({ adaContext }) => {
    const response = await adaContext.request.post("/api/payments/purchase", {
      data: {
        planId: "invalid-uuid",
      },
    });
    expect(response.status()).toBe(400);

    const { code, message } = await response.json();
    expect(code).toEqual("bad_request:api");
    expect(message).toContain("Invalid request body");
  });

  test("Ada cannot purchase non-existent plan", async ({ adaContext }) => {
    const response = await adaContext.request.post("/api/payments/purchase", {
      data: {
        planId: "00000000-0000-0000-0000-000000000000",
      },
    });
    expect(response.status()).toBe(400);

    const { code } = await response.json();
    expect(code).toEqual("bad_request:api");
  });

  test("Ada can purchase a valid subscription plan", async ({ adaContext }) => {
    // Get current balance
    const balanceResponse = await adaContext.request.get(
      "/api/credits/balance"
    );
    const { balance: initialBalance } = await balanceResponse.json();

    // Get plan details
    const plansResponse = await adaContext.request.get("/api/payments/plans");
    const { plans } = await plansResponse.json();
    const selectedPlan = plans[0];

    // Purchase the plan
    const response = await adaContext.request.post("/api/payments/purchase", {
      data: {
        planId: selectedPlan.id,
      },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data).toHaveProperty("purchase");
    expect(data).toHaveProperty("newBalance");

    // Verify purchase details
    expect(data.purchase.planId).toBe(selectedPlan.id);
    expect(data.purchase.creditsAdded).toBe(selectedPlan.credits);
    expect(data.purchase.amountPaid).toBe(selectedPlan.price);
    expect(data.purchase.status).toBe("completed");

    // Verify balance increased
    expect(data.newBalance).toBeGreaterThan(initialBalance);
    expect(data.newBalance).toBeCloseTo(
      initialBalance + selectedPlan.credits,
      2
    );
  });

  test("Ada can retrieve her purchase history", async ({ adaContext }) => {
    const response = await adaContext.request.get("/api/payments/history");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("purchases");
    expect(data).toHaveProperty("total");
    expect(Array.isArray(data.purchases)).toBe(true);

    // Should have at least the purchase from previous test
    expect(data.purchases.length).toBeGreaterThan(0);

    // Verify purchase structure
    const purchase = data.purchases[0];
    expect(purchase).toHaveProperty("id");
    expect(purchase).toHaveProperty("planId");
    expect(purchase).toHaveProperty("creditsAdded");
    expect(purchase).toHaveProperty("amountPaid");
    expect(purchase).toHaveProperty("status");
    expect(purchase).toHaveProperty("createdAt");
  });

  test("Ada can retrieve purchase history with pagination", async ({
    adaContext,
  }) => {
    const response = await adaContext.request.get(
      "/api/payments/history?limit=5&offset=0"
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.limit).toBe(5);
    expect(data.offset).toBe(0);
    expect(data.purchases.length).toBeLessThanOrEqual(5);
  });

  test("Ada cannot use invalid pagination parameters", async ({
    adaContext,
  }) => {
    const response = await adaContext.request.get(
      "/api/payments/history?limit=200"
    );
    expect(response.status()).toBe(400);

    const { code } = await response.json();
    expect(code).toEqual("bad_request:api");
  });

  test("Babbage cannot access Ada's purchase history", async ({
    adaContext,
    babbageContext,
  }) => {
    // Ada's purchases
    const adaResponse = await adaContext.request.get("/api/payments/history");
    const adaData = await adaResponse.json();

    // Babbage's purchases
    const babbageResponse = await babbageContext.request.get(
      "/api/payments/history"
    );
    const babbageData = await babbageResponse.json();

    // Both should succeed but have different data
    expect(adaResponse.status()).toBe(200);
    expect(babbageResponse.status()).toBe(200);

    // Verify they have different purchase histories
    if (adaData.purchases.length > 0 && babbageData.purchases.length > 0) {
      expect(adaData.purchases[0].id).not.toBe(babbageData.purchases[0].id);
    }
  });

  test("Multiple purchases correctly accumulate credits", async ({
    adaContext,
  }) => {
    // Get current balance
    const balanceResponse = await adaContext.request.get(
      "/api/credits/balance"
    );
    const { balance: initialBalance } = await balanceResponse.json();

    // Get plans
    const plansResponse = await adaContext.request.get("/api/payments/plans");
    const { plans } = await plansResponse.json();
    const selectedPlan = plans[0];

    // Make first purchase
    const firstPurchase = await adaContext.request.post(
      "/api/payments/purchase",
      {
        data: { planId: selectedPlan.id },
      }
    );
    const firstData = await firstPurchase.json();
    const balanceAfterFirst = firstData.newBalance;

    // Make second purchase
    const secondPurchase = await adaContext.request.post(
      "/api/payments/purchase",
      {
        data: { planId: selectedPlan.id },
      }
    );
    const secondData = await secondPurchase.json();
    const balanceAfterSecond = secondData.newBalance;

    // Verify credits accumulated correctly
    expect(balanceAfterFirst).toBeCloseTo(
      initialBalance + selectedPlan.credits,
      2
    );
    expect(balanceAfterSecond).toBeCloseTo(
      balanceAfterFirst + selectedPlan.credits,
      2
    );
  });
});
