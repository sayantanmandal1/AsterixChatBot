import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { subscriptionPlan } from "./schema";

config({
  path: ".env.local",
});

const seedPlans = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Seeding subscription plans...");

  const plans = [
    {
      name: "Free",
      credits: "200.00",
      price: "0.00",
      description: "Get started with basic features",
      isActive: true,
      displayOrder: 0,
    },
    {
      name: "Starter",
      credits: "500.00",
      price: "5.00",
      description: "Perfect for trying out the platform",
      isActive: true,
      displayOrder: 1,
    },
    {
      name: "Pro",
      credits: "2000.00",
      price: "15.00",
      description: "Great for regular users",
      isActive: true,
      displayOrder: 2,
    },
    {
      name: "Premium",
      credits: "5000.00",
      price: "30.00",
      description: "Best value for power users",
      isActive: true,
      displayOrder: 3,
    },
  ];

  try {
    const start = Date.now();
    
    for (const plan of plans) {
      await db.insert(subscriptionPlan).values(plan);
      console.log(`✓ Inserted plan: ${plan.name} (${plan.credits} credits, $${plan.price})`);
    }
    
    const end = Date.now();
    console.log(`✅ Seeding completed in ${end - start}ms`);
    
    // Verify the plans were inserted
    const insertedPlans = await db.select().from(subscriptionPlan);
    console.log(`\n📊 Total plans in database: ${insertedPlans.length}`);
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed");
    console.error(error);
    await connection.end();
    process.exit(1);
  }
};

seedPlans();
