const redis = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const client = redis.createClient({
  url: redisUrl,
  password: process.env.REDIS_PASSWORD || undefined,
  retry_strategy: (options) => {
    if (options.error && options.error.code === "ECONNREFUSED") {
      console.error("Redis connection refused");
      return new Error("The Redis server refused the connection");
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.error("Redis retry time exhausted");
      return new Error("Retry time exhausted");
    }
    if (options.attempt > 10) {
      console.error("Too many Redis connection attempts");
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  },
});

client.on("connect", () => {
  console.log("✅ Connected to Redis");
});

client.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

client.on("ready", () => {
  console.log("✅ Redis client ready");
});

client.on("end", () => {
  console.log("⚠️ Redis connection closed");
});

// Connect to Redis
(async () => {
  try {
    await client.connect();
  } catch (error) {
    console.error("❌ Failed to connect to Redis:", error);
  }
})();

// Cache helper functions
const cache = {
  // Get data from cache
  get: async (key) => {
    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  },

  // Set data in cache with TTL
  set: async (key, data, ttl = 3600) => {
    try {
      await client.setEx(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Cache set error:", error);
      return false;
    }
  },

  // Delete data from cache
  del: async (key) => {
    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error("Cache delete error:", error);
      return false;
    }
  },

  // Delete multiple keys matching a pattern
  delPattern: async (pattern) => {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error("Cache delete pattern error:", error);
      return 0;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      return await client.exists(key);
    } catch (error) {
      console.error("Cache exists error:", error);
      return false;
    }
  },
};

module.exports = { client, cache };
