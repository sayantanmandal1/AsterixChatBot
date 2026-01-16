import { expect, test } from "../fixtures";

test.describe.serial("/api/cron/monthly-allocation", () => {
  test("Cron endpoint returns success when called", async ({ request }) => {
    const response = await request.get("/api/cron/monthly-allocation");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("success");
    expect(data).toHaveProperty("message");
    expect(data.success).toBe(true);
  });

  test("Cron endpoint returns results summary", async ({ request }) => {
    const response = await request.get("/api/cron/monthly-allocation");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("results");
    expect(data.results).toHaveProperty("totalUsers");
    expect(data.results).toHaveProperty("eligibleUsers");
    expect(data.results).toHaveProperty("successfulAllocations");
    expect(data.results).toHaveProperty("failedAllocations");
    
    expect(typeof data.results.totalUsers).toBe("number");
    expect(typeof data.results.eligibleUsers).toBe("number");
    expect(typeof data.results.successfulAllocations).toBe("number");
    expect(typeof data.results.failedAllocations).toBe("number");
  });

  test("Cron endpoint is idempotent - running twice in same month doesn't duplicate allocations", async ({
    request,
  }) => {
    // First call
    const response1 = await request.get("/api/cron/monthly-allocation");
    expect(response1.status()).toBe(200);
    const data1 = await response1.json();
    
    // Second call immediately after
    const response2 = await request.get("/api/cron/monthly-allocation");
    expect(response2.status()).toBe(200);
    const data2 = await response2.json();
    
    // Second call should have 0 eligible users since they all received allocation
    expect(data2.results.eligibleUsers).toBe(0);
    expect(data2.results.successfulAllocations).toBe(0);
  });

  test("Cron endpoint rejects unauthorized requests when CRON_SECRET is set", async ({
    request,
  }) => {
    // Skip this test if CRON_SECRET is not set
    if (!process.env.CRON_SECRET) {
      test.skip();
      return;
    }

    // Request without authorization header
    const response = await request.get("/api/cron/monthly-allocation");
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toBe("Unauthorized");
  });

  test("Cron endpoint accepts authorized requests when CRON_SECRET is set", async ({
    request,
  }) => {
    // Skip this test if CRON_SECRET is not set
    if (!process.env.CRON_SECRET) {
      test.skip();
      return;
    }

    // Request with correct authorization header
    const response = await request.get("/api/cron/monthly-allocation", {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
