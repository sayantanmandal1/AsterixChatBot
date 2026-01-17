import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, lt } from "drizzle-orm";
import postgres from "postgres";
import { subscriptionPlan } from "./schema";

config({
  path: ".env.local",
});

const cleanupPlans = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("🧹 Cleaning up old subscription plans...");

  try {
    // Get all plans
    const allPlans = await db.select().from(subscriptionPlan);
    console.log(`Found ${allPlans.length} total plans`);

    // Find the cutoff date (plans created before the Free plan)
    const freePlan = allPlans.find(p => p.name === "Free");
    if (!freePlan) {
      console.log("❌ Free plan not found");
      await connection.end();
      process.exit(1);
    }

    console.log(`Free plan created at: ${freePlan.createdAt.toISOString()}`);

    // Deactivate all plans created before the Free plan
    const result = await db
      .update(subscriptionPlan)
      .set({ isActive: false })
      .where(lt(subscriptionPlan.createdAt, freePlan.createdAt));

    console.log(`✅ Deactivated old plans`);

    // Verify the active plans
    const activePlans = await db
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.isActive, true));

    console.log(`\n📊 Active plans: ${activePlans.length}`);
    for (const plan of activePlans) {
      console.log(`   - ${plan.name}: ${plan.credits} credits, $${plan.price}`);
    }

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed");
    console.error(error);
    await connection.end();
    process.exit(1);
  }
};

cleanupPlans();
