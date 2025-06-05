const { cache } = require("../config/redis");

// Generate cache key from request
const generateCacheKey = (req) => {
  const baseKey = `chapters:${req.method}:${req.path}`;

  // Include query parameters in cache key for GET requests
  if (req.method === "GET" && Object.keys(req.query).length > 0) {
    const sortedQuery = Object.keys(req.query)
      .sort()
      .reduce((obj, key) => {
        obj[key] = req.query[key];
        return obj;
      }, {});

    const queryString = new URLSearchParams(sortedQuery).toString();
    return `${baseKey}?${queryString}`;
  }

  return baseKey;
};

// Cache middleware for GET requests
const cacheMiddleware = (ttl = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = generateCacheKey(req);

    try {
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return res.status(200).json({
          ...cachedData,
          cached: true,
          cacheKey:
            process.env.NODE_ENV === "development" ? cacheKey : undefined,
        });
      }

      console.log(`Cache miss for key: ${cacheKey}`);

      // Store original res.json function
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function (data) {
        // Only cache successful responses
        if (res.statusCode === 200 && data.status === "success") {
          cache.set(cacheKey, data, ttl).catch((err) => {
            console.error("Failed to cache response:", err);
          });
        }

        // Call original res.json
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      // Continue without caching if Redis is down
      next();
    }
  };
};

// Clear cache patterns
const clearCachePattern = async (pattern) => {
  try {
    const deletedCount = await cache.delPattern(pattern);
    console.log(
      `Cleared ${deletedCount} cache entries matching pattern: ${pattern}`
    );
    return deletedCount;
  } catch (error) {
    console.error("Failed to clear cache pattern:", error);
    return 0;
  }
};

// Clear all chapter-related cache
const clearChapterCache = async () => {
  return await clearCachePattern("chapters:*");
};

// Clear specific cache key
const clearCache = async (key) => {
  try {
    await cache.del(key);
    console.log(`Cleared cache for key: ${key}`);
    return true;
  } catch (error) {
    console.error("Failed to clear cache:", error);
    return false;
  }
};

module.exports = {
  cacheMiddleware,
  clearCachePattern,
  clearChapterCache,
  clearCache,
  generateCacheKey,
};
