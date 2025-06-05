const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { client } = require('../config/redis');

// Rate limiter configuration
const rateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after a minute.',
    retryAfter: 60
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use IP address as the key for rate limiting
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again after a minute.',
      retryAfter: 60,
      timestamp: new Date().toISOString()
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  }
});

// Admin rate limiter (more lenient for admin operations)
const adminRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute for admin operations
  message: {
    status: 'error',
    message: 'Too many admin requests from this IP, please try again after a minute.',
    retryAfter: 60
  },
  keyGenerator: (req) => {
    return `admin_${req.ip || req.connection.remoteAddress || req.socket.remoteAddress}`;
  },
  handler: (req, res) => {
    console.log(`Admin rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many admin requests from this IP, please try again after a minute.',
      retryAfter: 60,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = { rateLimiter, adminRateLimiter };