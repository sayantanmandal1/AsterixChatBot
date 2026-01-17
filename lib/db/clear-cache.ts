import { config } from "dotenv";
import { createClient } from "redis";

config({
  path: ".env.local",
});

const clearCache = async () => {
  if (!process.env.REDIS_URL) {
    console.log("⚠️  REDIS_URL not configured, skipping cache clear");
    process.exit(0);
  }

  const redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);
  });

  try {
    await redisClient.connect();
    console.log("🔗 Connected to Redis");

    await redisClient.del("subscription:plans");
    console.log("✅ Cleared subscription plans cache");

    await redisClient.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Cache clear failed");
    console.error(error);
    await redisClient.disconnect();
    process.exit(1);
  }
};

clearCache();
