import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { subscriptionPlan } from "./schema";

config({
  path: ".env.local",
});

const verifyPlans = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("🔍 Verifying subscription plans...\n");

  try {
    const plans = await db.select().from(subscriptionPlan);
    
    if (plans.length === 0) {
      console.log("❌ No plans found in database");
    } else {
      console.log(`✅ Found ${plans.length} plan(s) in database:\n`);
      
      for (const plan of plans) {
        console.log(`📦 ${plan.name}`);
        console.log(`   Credits: ${plan.credits}`);
        console.log(`   Price: $${plan.price}`);
        console.log(`   Description: ${plan.description}`);
        console.log(`   Active: ${plan.isActive}`);
        console.log(`   Display Order: ${plan.displayOrder}`);
        console.log(`   Created: ${plan.createdAt.toISOString()}`);
        console.log();
      }
    }
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Verification failed");
    console.error(error);
    await connection.end();
    process.exit(1);
  }
};

verifyPlans();
