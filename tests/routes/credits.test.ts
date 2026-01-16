import { getMessageByErrorCode } from "@/lib/errors";
import { expect, test } from "../fixtures";

test.describe.serial("/api/credits", () => {
  test("Ada can retrieve her credit balance", async ({ adaContext }) => {
    const response = await adaContext.request.get("/api/credits/balance");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("balance");
    expect(data).toHaveProperty("isGuest");
    expect(typeof data.balance).toBe("number");
    expect(data.balance).toBeGreaterThanOrEqual(0);
  });

  test("Ada cannot deduct credits without request body", async ({
    adaContext,
  }) => {
    const response = await adaContext.request.post("/api/credits/deduct", {
      data: {},
    });
    expect(response.status()).toBe(400);

    const { code, message } = await response.json();
    expect(code).toEqual("bad_request:api");
    expect(message).toContain("Invalid request body");
  });

  test("Ada cannot deduct credits with invalid amount", async ({
    adaContext,
  }) => {
    const response = await adaContext.request.post("/api/credits/deduct", {
      data: {
        amount: -10,
        description: "Test deduction",
      },
    });
    expect(response.status()).toBe(400);

    const { code, message } = await response.json();
    expect(code).toEqual("bad_request:api");
    expect(message).toContain("Invalid request body");
  });

  test("Ada cannot deduct credits without description", async ({
    adaContext,
  }) => {
    const response = await adaContext.request.post("/api/credits/deduct", {
      data: {
        amount: 10,
      },
    });
    expect(response.status()).toBe(400);

    const { code, message } = await response.json();
    expect(code).toEqual("bad_request:api");
    expect(message).toContain("Invalid request body");
  });

  test("Ada can deduct credits with valid request", async ({ adaContext }) => {
    // First get current balance
    const balanceResponse = await adaContext.request.get(
      "/api/credits/balance"
    );
    const { balance: initialBalance } = await balanceResponse.json();

    // Deduct credits
    const deductAmount = 5.5;
    const response = await adaContext.request.post("/api/credits/deduct", {
      data: {
        amount: deductAmount,
        description: "Test message generation",
        metadata: { messageId: "test-123" },
      },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data).toHaveProperty("newBalance");
    expect(data).toHaveProperty("transaction");
    expect(data.transaction.type).toBe("deduction");
    expect(data.transaction.amount).toBe(deductAmount);

    // Verify balance decreased
    expect(data.newBalance).toBeLessThan(initialBalance);
    expect(data.newBalance).toBeCloseTo(initialBalance - deductAmount, 2);
  });

  test("Ada cannot deduct more credits than available", async ({
    adaContext,
  }) => {
    // Get current balance
    const balanceResponse = await adaContext.request.get(
      "/api/credits/balance"
    );
    const { balance } = await balanceResponse.json();

    // Try to deduct more than available
    const response = await adaContext.request.post("/api/credits/deduct", {
      data: {
        amount: balance + 100,
        description: "Excessive deduction",
      },
    });
    expect(response.status()).toBe(400);

    const { code, message } = await response.json();
    expect(code).toEqual("bad_request:api");
    expect(message).toContain("Insufficient credits");
  });

  test("Ada can retrieve her transaction history", async ({ adaContext }) => {
    const response = await adaContext.request.get(
      "/api/credits/transactions"
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("transactions");
    expect(data).toHaveProperty("total");
    expect(Array.isArray(data.transactions)).toBe(true);

    // Should have at least the deduction from previous test
    expect(data.transactions.length).toBeGreaterThan(0);

    // Verify transaction structure
    const transaction = data.transactions[0];
    expect(transaction).toHaveProperty("id");
    expect(transaction).toHaveProperty("type");
    expect(transaction).toHaveProperty("amount");
    expect(transaction).toHaveProperty("balanceAfter");
    expect(transaction).toHaveProperty("description");
    expect(transaction).toHaveProperty("createdAt");
  });

  test("Ada can retrieve transaction history with pagination", async ({
    adaContext,
  }) => {
    const response = await adaContext.request.get(
      "/api/credits/transactions?limit=5&offset=0"
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.limit).toBe(5);
    expect(data.offset).toBe(0);
    expect(data.transactions.length).toBeLessThanOrEqual(5);
  });

  test("Ada cannot use invalid pagination parameters", async ({
    adaContext,
  }) => {
    const response = await adaContext.request.get(
      "/api/credits/transactions?limit=200"
    );
    expect(response.status()).toBe(400);

    const { code } = await response.json();
    expect(code).toEqual("bad_request:api");
  });

  test("Babbage cannot access Ada's transaction history", async ({
    adaContext,
    babbageContext,
  }) => {
    // Ada's transactions
    const adaResponse = await adaContext.request.get(
      "/api/credits/transactions"
    );
    const adaData = await adaResponse.json();

    // Babbage's transactions
    const babbageResponse = await babbageContext.request.get(
      "/api/credits/transactions"
    );
    const babbageData = await babbageResponse.json();

    // Both should succeed but have different data
    expect(adaResponse.status()).toBe(200);
    expect(babbageResponse.status()).toBe(200);

    // Verify they have different transaction histories
    // (This assumes they have different transactions)
    if (adaData.transactions.length > 0 && babbageData.transactions.length > 0) {
      expect(adaData.transactions[0].id).not.toBe(
        babbageData.transactions[0].id
      );
    }
  });
});
